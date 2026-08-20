import { WHOOP_API_BASE, type Paginated } from "./types";

/**
 * Minimal client for the WHOOP v2 REST API.
 *
 * Two things it has to get right:
 *
 *  - **Rate limits.** WHOOP allows 100 requests/minute and 10,000/day. A backfill
 *    walks many pages, so requests are spaced out and 429s are honoured via the
 *    `X-RateLimit-Reset` header rather than a blind retry.
 *  - **Pagination.** Collections are cursor-based on `next_token`; the cursor is
 *    followed until it comes back empty.
 */

const MIN_REQUEST_SPACING_MS = 650; // ~92 req/min, comfortably under the 100 ceiling.

export class WhoopRateLimitError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`WHOOP rate limit hit; retry in ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "WhoopRateLimitError";
  }
}

export class WhoopAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhoopAuthError";
  }
}

export class WhoopClient {
  private lastRequestAt = 0;

  constructor(private readonly accessToken: string) {}

  private async throttle() {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < MIN_REQUEST_SPACING_MS) {
      await sleep(MIN_REQUEST_SPACING_MS - elapsed);
    }
    this.lastRequestAt = Date.now();
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${WHOOP_API_BASE}${path}`);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.throttle();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        cache: "no-store",
      });

      if (res.status === 401) {
        throw new WhoopAuthError("WHOOP access token rejected — refresh required");
      }

      if (res.status === 429) {
        const reset = Number(res.headers.get("X-RateLimit-Reset"));
        const waitMs = Number.isFinite(reset) && reset > 0 ? reset * 1000 : 60_000;
        if (attempt === 2) throw new WhoopRateLimitError(waitMs);
        await sleep(Math.min(waitMs, 60_000));
        continue;
      }

      // 5xx is worth one more try; anything else is a real error.
      if (res.status >= 500 && attempt < 2) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }

      if (!res.ok) {
        throw new Error(`WHOOP ${path} failed (${res.status}): ${await res.text()}`);
      }

      return (await res.json()) as T;
    }

    throw new Error(`WHOOP ${path} failed after retries`);
  }

  /**
   * Walks a cursor-paginated collection. `maxRecords` is a safety valve so a
   * backfill can be capped rather than running until the rate limit stops it.
   */
  async *paginate<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
    maxRecords = 10_000,
  ): AsyncGenerator<T> {
    let nextToken: string | undefined;
    let yielded = 0;

    do {
      const page: Paginated<T> = await this.get<Paginated<T>>(path, {
        limit: 25,
        ...params,
        nextToken,
      });

      for (const record of page.records ?? []) {
        yield record;
        if (++yielded >= maxRecords) return;
      }

      nextToken = page.next_token ?? undefined;
    } while (nextToken);
  }

  async collect<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
    maxRecords = 10_000,
  ): Promise<T[]> {
    const out: T[] = [];
    for await (const record of this.paginate<T>(path, params, maxRecords)) out.push(record);
    return out;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
