import type { ActionResult } from "@/app/friends/actions";

/**
 * Turns a server action's `{ key, handle }` into a sentence.
 *
 * The action runs on the server and cannot know which language the form was
 * rendered in, so it returns a key. The page ships the resolved strings down
 * with the form, and the placeholder is filled in here.
 */
export function resolveMessage(dict: Record<string, string>, result: ActionResult): string {
  const template = dict[result.key] ?? result.key;
  return result.handle ? template.replace(/\{handle\}/g, result.handle) : template;
}
