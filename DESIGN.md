# Spec-Sheet UI — design system

A complete, portable specification of the interface style used in this project.
Written to be **pasted into a Cursor chat** as the design brief for any new
project. Every token, class and component below is copy-paste ready and
zero-runtime: the theme lives entirely in CSS custom properties, so server
components never need to know which theme is active.

Stack it assumes: **Next.js App Router + React 19 + Tailwind CSS v4**. Nothing
else. No component library, no CSS-in-JS, no icon package.

---

## 0. The prompt

> Copy everything between the rules into a Cursor chat when starting a new
> project, then point it at this file for the full detail.

---

Build the UI as a **technical spec sheet**, not a card-based dashboard.

- Separate content with **hairline rules**, never with shadows or elevation.
  There is exactly one border colour and it is one shade off the surface.
- **Square corners.** `border-radius: 0` everywhere except pills (`999px`) and
  the active chip in a segmented control (`4px`).
- **Two typefaces, two jobs.** A tight neo-grotesque (Inter) for anything a
  person wrote; a monospace (IBM Plex Mono) for anything a machine produced —
  numbers, units, labels, metadata, axis ticks, IDs, timestamps.
- **Ink is the accent.** There is no brand colour in the chrome. The primary
  button is solid text colour; it is the one element on the page that inverts.
- **Colour is spent only where it carries information** — in data. Chrome is
  monochrome.
- Colour is **never the only carrier of meaning**: every coloured status ships
  with a number, a written label, or a mark (`▲ ■ ▼`).
- Density is a feature. Small type (11–15px), tight tracking on headings
  (`-0.02em`), generous line-height on prose (`leading-relaxed`).
- Every asynchronous section gets **its own `<Suspense>` boundary and its own
  skeleton**, sized to match the real content so nothing shifts on arrival.

---

## 1. Why it looks like this

A spec sheet separates information with rules because it has a lot of
information and no room for chrome. Cards floating at different elevations force
the reader to decide what is on top of what before they can read anything;
hairlines just say "this ends here, that begins there". On a dense page that is
the difference between legible and busy.

The typeface split does the rest of the work. When every number on the page is
monospace and every sentence is not, the reader learns the rule in about two
seconds and can then scan for data without reading. That is why it is worth
shipping a second font file.

---

## 2. Non-negotiables

| Rule | Enforcement |
| --- | --- |
| No `box-shadow` anywhere | Structure comes from `border border-hairline` |
| No `border-radius` on containers | Only `--radius-chip` (4px) and `--radius-pill` |
| No hardcoded hex in components | Always `var(--color-*)` or a Tailwind token class |
| No colour without a word or number | Status = swatch **and** label |
| No shimmer/gradient skeletons | Flat `animate-pulse` on `bg-surface-2` |
| No layout shift on data arrival | Skeleton dimensions hardcoded to match |
| No `<div>` grid for tabular data | `<dl>`, `<ul>`, `<table>` — the semantics are free |

---

## 3. Tokens — `app/globals.css`

Tailwind v4 generates utilities directly from `@theme`. Declaring
`--color-hairline` gives you `border-hairline`, `bg-hairline`, `text-hairline`
with no config file. Both themes are declared; `data-theme` on `<html>` selects.

```css
@import "tailwindcss";

@theme {
  /* Re-bound per theme below; these are the light values. */
  --color-plane: #ffffff;      /* page background       */
  --color-surface: #ffffff;    /* panel background      */
  --color-surface-2: #f4f4f2;  /* fills, active chips, skeletons */
  --color-hairline: #dcdcd8;   /* every border          */
  --color-baseline: #b4b4ae;   /* reference lines       */

  --color-ink: #0a0a0a;        /* primary text          */
  --color-ink-2: #4b4b47;      /* secondary text        */
  --color-muted: #86867f;      /* captions, labels      */

  /* Categorical series — assigned in fixed order, never cycled. */
  --color-series-1: #6786c4;   /* slate      */
  --color-series-2: #4e8f63;   /* moss       */
  --color-series-3: #c0623c;   /* terracotta */
  --color-series-4: #8579b8;   /* heather    */

  /* Status — never used as a series colour. */
  --color-good: #3f8f57;
  --color-warning: #b5842c;
  --color-critical: #c0483a;

  /* An ordinal ramp: one hue, light → dark. For ordered categories. */
  --color-step-1: #b9c6dd;
  --color-step-2: #8ea6cc;
  --color-step-3: #6786c4;
  --color-step-4: #47639b;

  --font-sans: var(--font-grotesque), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-monospace), ui-monospace, "SF Mono", Menlo, monospace;

  --radius-none: 0px;
  --radius-chip: 4px;
  --radius-pill: 999px;
}

/* Light is the default so a first paint with no stored preference — and a
   printed page — lands somewhere sane. */
:root,
[data-theme="light"] {
  color-scheme: light;

  --color-plane: #ffffff;
  --color-surface: #ffffff;
  --color-surface-2: #f4f4f2;
  --color-hairline: #dcdcd8;
  --color-baseline: #b4b4ae;

  --color-ink: #0a0a0a;
  --color-ink-2: #4b4b47;
  --color-muted: #86867f;

  /* Ink is the accent. */
  --color-accent: #0a0a0a;
  --color-accent-ink: #ffffff;

  --color-series-1: #6786c4;
  --color-series-2: #4e8f63;
  --color-series-3: #c0623c;
  --color-series-4: #8579b8;

  --color-good: #3f8f57;
  --color-warning: #b5842c;
  --color-critical: #c0483a;

  --color-step-1: #b9c6dd;
  --color-step-2: #8ea6cc;
  --color-step-3: #6786c4;
  --color-step-4: #47639b;

  --color-grid: #ecece8;       /* faint grid behind a plot area */
}

[data-theme="dark"] {
  color-scheme: dark;

  --color-plane: #0a0a0a;
  --color-surface: #101010;
  --color-surface-2: #171716;
  --color-hairline: #272725;
  --color-baseline: #3d3d3a;

  --color-ink: #fafaf8;
  --color-ink-2: #b5b5ad;
  --color-muted: #7d7d76;

  --color-accent: #fafaf8;
  --color-accent-ink: #0a0a0a;

  /* Same hues, lifted a step so they clear a near-black ground. */
  --color-series-1: #8aa3d4;
  --color-series-2: #6aa87d;
  --color-series-3: #d17a52;
  --color-series-4: #9d92cc;

  --color-good: #5aa872;
  --color-warning: #cf9a3c;
  --color-critical: #d4604f;

  --color-step-1: #cbd6e8;
  --color-step-2: #a3b6d8;
  --color-step-3: #8aa3d4;
  --color-step-4: #5d78ad;

  --color-grid: #1f1f1e;
}

html {
  background-color: var(--color-plane);
  -webkit-tap-highlight-color: transparent;
}

body {
  background-color: var(--color-plane);
  color: var(--color-ink);
  font-family: var(--font-sans);
  /* Clears the iPhone notch and home indicator in standalone PWA mode. */
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* The size does the work, so the tracking should not also be shouting. */
h1, h2, h3 { letter-spacing: -0.02em; }

/* Axis ticks and table columns align vertically; hero figures do not. */
.tabular { font-variant-numeric: tabular-nums; }

/* The eyebrow: section labels, metric names, anything that is a caption
   rather than a sentence. */
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
}

/* Numbers are machine output, so they are set in the machine face. */
.numeral {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--color-hairline); }
::-webkit-scrollbar-track { background: transparent; }

::selection { background: var(--color-ink); color: var(--color-plane); }

/* Square focus ring, consistent with everything else being square. */
:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Palette contract

The four series colours are picked to survive **both** grounds and the common
colour-vision deficiencies. If you swap them, re-check:

- adjacent categorical pairs under protanopia/deuteranopia/tritanopia;
- every series against both `--color-plane` values at 3:1 (WCAG graphics minimum);
- text tokens against their surface at 4.5:1.

Two rules fall out of the set above and are enforced in components:

1. `series-4` (heather) never shares a **scatter** plot with `series-1` (slate) —
   the pair collapses under protanopia. It is fine on lines and stacks, where
   marks are physically separated.
2. A red/amber/green status ramp is inherently not CVD-separable, so it never
   carries meaning alone: every use ships the number and a written label.

---

## 4. Typography

Loaded with `next/font` so both are self-hosted — no runtime request to Google,
no layout shift while a webfont arrives.

```tsx
import { Inter, IBM_Plex_Mono } from "next/font/google";

const grotesque = Inter({
  subsets: ["latin"],
  variable: "--font-grotesque",
  display: "swap",
});

const monospace = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-monospace",
  display: "swap",
});

// <html className={`${grotesque.variable} ${monospace.variable}`}>
```

### The scale

Sizes are set in exact pixels, not Tailwind's `text-sm`/`text-base` steps. The
scale is tight and a half-step matters at this density.

| Role | Class | Face |
| --- | --- | --- |
| Page title | `text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[38px]` | sans |
| Hero figure | `numeral text-[64px] font-medium leading-[0.85] tracking-[-0.03em] sm:text-[76px]` | mono |
| Panel title | `text-[15px] font-semibold tracking-tight` | sans |
| Stat value | `numeral text-[28px] font-medium leading-none` | mono |
| Row label | `text-[14px] font-medium` | sans |
| Body / description | `text-[15px] leading-relaxed text-ink-2` | sans |
| Subtitle / detail | `text-[13px] leading-relaxed text-muted` | sans |
| Nav link | `text-[13px]` | sans |
| Caption / delta | `text-[12px]` | mono if numeric |
| Eyebrow | `.eyebrow` (11px, uppercase, `0.08em`) | mono |
| Axis tick | `11px` | mono |

**The rule:** if a human wrote it, sans. If a machine produced it, `.numeral` or
`.eyebrow`. A metric label is machine output. A sentence explaining the metric
is not.

---

## 5. Layout and spacing

```tsx
// Page shell
<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
```

- **Container:** `max-w-7xl`, padding `px-4 sm:px-6`.
- **Between page blocks:** `space-y-5`.
- **Between grid cells:** `gap-4` for tiles, `gap-5` for panels.
- **Panel padding:** `p-5 sm:p-6`. **Tile padding:** `p-4 sm:p-5`.

Grid patterns actually in use — reuse these rather than inventing new ones:

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">      {/* stat tiles     */}
<div className="grid gap-5 lg:grid-cols-2">                     {/* paired panels  */}
<div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">           {/* hero + detail  */}
<dl className="grid grid-cols-3 gap-4 border-t border-hairline pt-5"> {/* vitals row */}
```

The asymmetric `[1fr_1.4fr]` is deliberate: a hero figure needs less width than
the explanation next to it, and two equal columns make the number look stranded.

---

## 6. Components

### 6.1 `cn`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 6.2 Panel, PanelHeader, PageHeader

A panel is a rectangle with a hairline around it. No radius, no shadow, no
tinted fill. That is the entire structural vocabulary.

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={cn("border border-hairline bg-surface p-5 sm:p-6", className)}>{children}</Tag>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle ? <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** Eyebrow in mono, headline in large tight grotesque — the two faces doing
 *  the two jobs they were picked for. */
export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[38px]">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{description}</p>
      ) : null}
    </div>
  );
}
```

### 6.3 Buttons

Two weights plus a quiet variant. `primary` is solid ink — on a page with no
brand colour, the primary action is simply the one element that inverts.

```tsx
import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const BASE =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-medium transition-colors disabled:opacity-50";

const VARIANTS = {
  primary: "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90",
  secondary: "border border-hairline text-ink hover:bg-surface-2",
  quiet: "text-muted hover:text-ink",
} as const;

type Variant = keyof typeof VARIANTS;

export function Button({
  variant = "secondary",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; children: ReactNode }) {
  return (
    <button className={cn(BASE, VARIANTS[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; children: ReactNode }) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], className)} {...props}>
      {children}
    </Link>
  );
}
```

`secondary` is the default on purpose. A page where everything is primary has no
primary.

### 6.4 StatTile and HeroFigure

A stat tile is the right form when the answer is one number. Reaching for a
chart to show a single value is the most common way a dashboard misses its
point.

```tsx
export function StatTile({
  label, value, unit, caption, accent, delta, deltaLabel, deltaGood,
}: {
  label: string;
  value: string | number;
  unit?: string;
  caption?: string;
  /** A small square in the series colour. Never the only carrier of meaning. */
  accent?: string;
  delta?: number;
  deltaLabel?: string;
  /** Whether a positive delta is a good thing. Resting HR going up is not. */
  deltaGood?: boolean;
}) {
  const deltaPositive = typeof delta === "number" && delta > 0;
  const deltaIsGood = deltaGood === undefined ? deltaPositive : deltaPositive === deltaGood;

  return (
    <div className="border border-hairline bg-surface p-4 sm:p-5">
      <p className="eyebrow flex items-center gap-2">
        {accent ? (
          <span aria-hidden className="h-2 w-2 shrink-0" style={{ backgroundColor: accent }} />
        ) : null}
        {label}
      </p>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="numeral text-[28px] font-medium leading-none text-ink">{value}</span>
        {unit ? <span className="numeral text-[13px] text-muted">{unit}</span> : null}
      </p>

      {typeof delta === "number" ? (
        <p className={cn("numeral mt-2 text-[12px]", deltaIsGood ? "text-good" : "text-critical")}>
          {/* Arrow plus sign plus text: never colour alone. */}
          <span aria-hidden>{deltaPositive ? "▲" : "▼"} </span>
          {deltaPositive ? "+" : "−"}
          {Math.abs(Number(delta.toFixed(Math.abs(delta) < 10 ? 1 : 0)))}
          {deltaLabel ? <span className="text-muted"> {deltaLabel}</span> : null}
        </p>
      ) : null}

      {caption ? <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{caption}</p> : null}
    </div>
  );
}

/** The one number a page is built around. */
export function HeroFigure({
  value, unit, label, color, status, children,
}: {
  value: string | number;
  unit?: string;
  label: string;
  color?: string;
  /** The written half of a status pairing. Required wherever `color` means something. */
  status?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-4 flex items-baseline gap-2">
        <span
          className="numeral text-[64px] font-medium leading-[0.85] tracking-[-0.03em] sm:text-[76px]"
          style={{ color }}
        >
          {value}
        </span>
        {unit ? <span className="numeral text-lg text-muted">{unit}</span> : null}
      </p>
      {status ? (
        <p className="mt-4 inline-flex items-center gap-2 border border-hairline px-2.5 py-1 text-[12px] font-medium text-ink-2">
          <span aria-hidden className="h-2 w-2" style={{ backgroundColor: color ?? "currentColor" }} />
          {status}
        </p>
      ) : null}
      {children}
    </div>
  );
}
```

### 6.5 SpecList — the numbered table row

The signature pattern of this system: `01  Every model behind one key`. Rows
share edges rather than sitting apart, so a list reads as one table.

```tsx
export function SpecList({ children }: { children: ReactNode }) {
  return <div className="border border-hairline">{children}</div>;
}

export function SpecRow({
  index, label, value, children,
}: {
  index?: number;
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-4 border-b border-hairline p-4 last:border-b-0 sm:px-5">
      {index !== undefined ? (
        <span className="numeral shrink-0 text-[12px] text-muted">
          {index.toString().padStart(2, "0")}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">{label}</p>
        {children ? <div className="mt-1 text-[13px] leading-relaxed text-muted">{children}</div> : null}
      </div>
      {value ? <div className="numeral shrink-0 text-[13px] text-ink">{value}</div> : null}
    </div>
  );
}
```

The same idea drives status lists: a tone mark, a title, a detail, all sharing
one border stack.

```tsx
const TONE = {
  positive: { color: "var(--color-good)",     mark: "▲" },
  neutral:  { color: "var(--color-muted)",    mark: "■" },
  caution:  { color: "var(--color-warning)",  mark: "▲" },
  alert:    { color: "var(--color-critical)", mark: "■" },
} as const;

<ul className="border-t border-hairline">
  {items.map((item) => (
    <li key={item.id} className="border-b border-hairline py-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-[5px] shrink-0 text-[9px] leading-none"
              style={{ color: TONE[item.tone].color }}>
          {TONE[item.tone].mark}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2.5 text-[14px] font-medium leading-snug text-ink">
            {item.title}
            <span className="eyebrow">{item.tone}</span>
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{item.detail}</p>
        </div>
      </div>
    </li>
  ))}
</ul>
```

### 6.6 Header

One hairline rule with everything sitting on it. Section links use the
segmented-control treatment: the active one takes a soft fill and full ink, the
rest stay muted. This is the **one** place a small radius is allowed, because a
filled square behind text at this size reads as a button rather than a tab.

```tsx
<header className="sticky top-0 z-40 border-b border-hairline bg-plane/90 backdrop-blur-md">
  <div className="mx-auto max-w-7xl px-4 sm:px-6">
    <div className="flex h-14 items-center justify-between gap-4">
      <Link href="/" className="flex shrink-0 items-baseline gap-1.5">
        <span className="text-[17px] font-semibold tracking-[-0.03em] text-ink">brand</span>
        <span className="eyebrow hidden text-[9px] sm:inline">suffix</span>
      </Link>

      {/* Horizontally scrollable so the nav never wraps on a phone. */}
      <nav
        aria-label="Primary"
        className="-mx-2 flex flex-1 items-center gap-0.5 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-[4px] px-2.5 py-1.5 text-[13px] transition-colors",
                active ? "bg-surface-2 font-medium text-ink" : "text-muted hover:text-ink-2",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  </div>
</header>
```

Header height is fixed at `h-14`. Anything in the header that needs a database
answer should arrive as a **`ReactNode` slot**, not a prop — see §10.

### 6.7 Skeletons

The point of a skeleton is not decoration, it is **layout**. If the placeholder
is a different height from the content, the page jumps when data lands and the
reader loses their place. So each skeleton is built from the same spacing and
type scale as the component it stands in for, with sizes hardcoded to match.

No shimmer sweep: on a page that fills in one panel at a time, half a dozen
gradients travelling in parallel is noise. A quiet opacity pulse says "working"
without competing with the numbers that have already arrived — and it is
disabled outright under `prefers-reduced-motion` by the global stylesheet.

Every placeholder is `aria-hidden`. A screen reader gains nothing from a tree of
grey rectangles, and React announces the real content when it swaps in.

```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse bg-surface-2", className)} />;
}

/** Matches StatTile: eyebrow, 28px numeral, optional caption. */
export function StatTileSkeleton({ caption = true }: { caption?: boolean }) {
  return (
    <div className="border border-hairline bg-surface p-4 sm:p-5">
      <Skeleton className="h-[11px] w-24" />
      <Skeleton className="mt-3 h-7 w-20" />
      {caption ? <Skeleton className="mt-3 h-[12px] w-full max-w-[11rem]" /> : null}
    </div>
  );
}

/** Matches PanelHeader: 15px title over a 13px subtitle. */
export function PanelHeaderSkeleton({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div className="mb-5">
      <Skeleton className="h-[15px] w-40" />
      {subtitle ? <Skeleton className="mt-2.5 h-[13px] w-full max-w-sm" /> : null}
    </div>
  );
}

/** Matches PageHeader, so the title block never shifts once copy resolves. */
export function PageHeaderSkeleton({ description = true }: { description?: boolean }) {
  return (
    <div className="mb-8">
      <Skeleton className="mb-3 h-[11px] w-20" />
      <Skeleton className="h-[38px] w-64 max-w-full" />
      {description ? <Skeleton className="mt-4 h-[15px] w-full max-w-2xl" /> : null}
    </div>
  );
}

/**
 * A chart placeholder. Bars of varying height rather than one flat block: a
 * solid rectangle at chart size reads as a broken image, whereas a silhouette
 * reads as a chart that has not arrived yet.
 */
export function ChartSkeleton({ height = 220 }: { height?: number | string }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} aria-hidden>
      {BAR_HEIGHTS.map((percent, i) => (
        <span
          key={i}
          className="flex-1 animate-pulse bg-surface-2"
          style={{ height: `${percent}%`, animationDelay: `${(i % 8) * 60}ms` }}
        />
      ))}
    </div>
  );
}

/* Fixed, not random: a placeholder that reshuffles on every render would
   flicker between the server pass and hydration, and the silhouette carries no
   meaning anyway. */
const BAR_HEIGHTS = [
  46, 62, 38, 71, 55, 83, 49, 66, 41, 74, 58, 45, 69, 52, 78, 43, 61, 70, 36, 64,
  50, 76, 44, 68, 57, 39, 72, 53, 65, 47,
];
```

Compose panel-level skeletons from the primitives rather than writing new
markup, so a change to `Panel` padding cannot desynchronise them:

```tsx
export function ChartPanelSkeleton({ height = 220 }: { height?: number | string }) {
  return (
    <section className="border border-hairline bg-surface p-5 sm:p-6">
      <PanelHeaderSkeleton />
      <ChartSkeleton height={height} />
    </section>
  );
}
```

---

## 7. Charts

Chart chrome is recessive. Grid and axes are solid hairlines one shade off the
surface — **never dashed** — matching the rules that separate everything else.
Axis ticks are monospace, because they are machine output.

```ts
export function axisProps(tokens: ChartTokens) {
  return {
    stroke: tokens.hairline,
    tick: { fill: tokens.muted, fontSize: 11, fontFamily: "var(--font-mono)" },
    tickLine: false,
    axisLine: false,
  } as const;
}

export function gridProps(tokens: ChartTokens) {
  return { stroke: tokens.grid, strokeDasharray: "0", vertical: false } as const;
}

/** Consistent margins mean the plot areas of stacked charts line up down the page. */
export const chartMargin = { top: 8, right: 12, bottom: 4, left: 4 } as const;
```

Rules:

- **Series assignment is fixed.** A metric owns a slot for the life of the app;
  colours are never cycled by index.
- **Legend whenever two or more series share a plot.** Swatch is `h-2.5 w-2.5`
  square, or `h-[2px] w-4` for a line series.
- **Tooltip values wear text tokens, never the series colour** — the swatch
  already identifies the series, and coloured numbers are harder to read.
- `isAnimationActive={false}`. Entry animation on a dashboard delays the answer.
- Short axis labels: `12 Aug` beats `2026-08-12` at 11px.

```tsx
export function TooltipShell({ title, rows, footer }: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
  footer?: ReactNode;
}) {
  return (
    <div className="pointer-events-none border border-hairline bg-surface px-3 py-2.5">
      <p className="eyebrow mb-2">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-6 text-[12px]">
            <span className="flex items-center gap-1.5 text-ink-2">
              {row.color ? (
                <span aria-hidden className="h-2 w-2 shrink-0" style={{ backgroundColor: row.color }} />
              ) : null}
              {row.label}
            </span>
            <span className="numeral text-[12px] font-medium text-ink">{row.value}</span>
          </div>
        ))}
      </div>
      {footer ? (
        <div className="mt-2 border-t border-hairline pt-2 text-[11px] text-muted">{footer}</div>
      ) : null}
    </div>
  );
}
```

### Reading tokens in a chart

Most coloured elements can simply say `var(--color-critical)` and let the
cascade resolve per theme — including on the server, where the theme is
unknowable. Charting libraries are the exception: several props end up in canvas
draws or SVG gradient stops that need a concrete value.

```ts
"use client";
import { useEffect, useState } from "react";

const VARIABLES = {
  series1: "--color-series-1",
  muted: "--color-muted",
  grid: "--color-grid",
  hairline: "--color-hairline",
  // …one entry per token the charts need
} as const;

export type ChartTokens = Record<keyof typeof VARIABLES, string>;

/** The light values restated in JS: a server render has no document to read. */
const FALLBACK: ChartTokens = {
  series1: "#6786c4", muted: "#86867f", grid: "#ecece8", hairline: "#dcdcd8",
};

function read(): ChartTokens {
  if (typeof window === "undefined") return FALLBACK;
  const styles = getComputedStyle(document.documentElement);
  const out = {} as ChartTokens;
  for (const [key, variable] of Object.entries(VARIABLES) as [keyof ChartTokens, string][]) {
    out[key] = styles.getPropertyValue(variable).trim() || FALLBACK[key];
  }
  return out;
}

export function useChartTokens(): ChartTokens {
  const [tokens, setTokens] = useState<ChartTokens>(FALLBACK);

  useEffect(() => {
    setTokens(read());
    // The toggle mutates data-theme on <html>, which is what this watches.
    const observer = new MutationObserver(() => setTokens(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return tokens;
}
```

### Charts are always lazy

A charting library is the single largest thing on a dashboard route. Keep it out
of the first load entirely:

```tsx
"use client";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/ui/skeleton";

export const TrendChart = dynamic(
  () => import("./trend-chart").then((m) => m.TrendChart),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> },
);
```

`ssr: false` is correct here rather than a compromise: a chart rendered on the
server is thrown away and re-rendered on the client anyway, since it needs
measured container width.

---

## 8. Theme switching without a flash

A dark-mode app that renders white for one frame on every load is worse than one
with no light mode at all, and React cannot help — the attribute has to be on
`<html>` before the body paints. So this is a **blocking inline script**,
deliberately. It is ~200 bytes and runs synchronously in `<head>`.

```tsx
const SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('app-theme');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var theme = stored === 'light' || stored === 'dark' ? stored : system;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
```

Put it in `<head>` and add `suppressHydrationWarning` to `<html>`.

The toggle is deliberately **two-state, not three**: the head script already
follows the system when nothing is stored, so "system" is the default rather
than a third thing to choose. Once you have expressed a preference, honouring it
is the whole point.

```tsx
"use client";
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  // The server cannot know the theme, so the icon renders only after mount.
  // Reading from the DOM rather than storage keeps it in step with the head script.
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try { localStorage.setItem("app-theme", next); } catch {}
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Theme: ${theme ?? "light"}`}
      className="flex h-[26px] w-[26px] items-center justify-center border border-hairline text-muted transition-colors hover:text-ink"
    >
      {/* Drawn, not an emoji glyph: the emoji sun and moon render at wildly
          different weights across platforms and one of them always looks wrong. */}
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>{/* … */}</svg>
    </button>
  );
}
```

Also set both theme colours in the viewport so browser chrome matches:

```ts
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  maximumScale: 1,       // prevents zoom-on-input jump in home-screen apps
  width: "device-width",
  initialScale: 1,
};
```

---

## 9. Accessibility contract

- **Contrast:** text 4.5:1 against its surface, graphics and series 3:1. Both
  themes, checked independently.
- **Colour never alone.** Status = swatch **and** word. Delta = arrow **and**
  sign **and** number. Chart band = fill **and** the value on the axis.
- **Focus is visible and square:** `outline: 2px solid var(--color-ink)` with
  `outline-offset: 2px`. Never `outline: none`.
- **Decorative marks are `aria-hidden`:** swatches, arrows, tone marks, bars,
  every skeleton.
- **Reduced motion** kills all animation globally — the pulse included.
- `aria-current="page"` on the active nav link, `aria-label` on icon-only
  controls, `aria-label` on the primary `<nav>`.
- Use real semantics: `<dl>` for label/value pairs, `<ul>` for lists of
  findings, `<header>`/`<main>`/`<footer>` for the shell.

---

## 10. Architecture: one skeleton per component

The design and the loading strategy are the same decision. A page built from
independent panels should *load* as independent panels.

**The rule:** a page component is a layout, not a loader. It awaits nothing
beyond trivial synchronous context. Each section fetches its own data and is
wrapped in its own `<Suspense>` with the skeleton that matches it.

```tsx
export default async function Page() {
  // Kicks off the underlying fetches while React is still walking this tree, so
  // the sections below wait on queries that are already in flight.
  void preloadData();

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Overview" title="Today" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<StatTileSkeleton />}><TileA /></Suspense>
        <Suspense fallback={<StatTileSkeleton />}><TileB /></Suspense>
        <Suspense fallback={<StatTileSkeleton />}><TileC /></Suspense>
        <Suspense fallback={<StatTileSkeleton />}><TileD /></Suspense>
      </div>

      <Panel>
        <Suspense fallback={<ChartPanelSkeleton height={260} />}><Trend /></Suspense>
      </Panel>
    </div>
  );
}
```

Supporting rules that make this actually fast:

- **Never `await` in the root layout** beyond a cookie read or a static import.
  A layout is the outermost thing React renders, so anything awaited there is
  awaited before the browser receives a single byte — no streaming, no early
  stylesheet or font fetch, no skeletons. Header elements that need data arrive
  as **`ReactNode` slots** wrapped in `<Suspense>` by the layout.
- **No writes on a read path.** Provision users in the auth callback, not in the
  session getter that every page calls.
- **Fetch per table, not per page.** Wrap each fetcher in React's `cache()` so
  overlapping sections share one query instead of issuing duplicates, and
  compose them into named slices so a section that needs two tables never waits
  on four.
- **Memoise derived computation** the same way, so parallel sections do not each
  recompute the same aggregate.
- **A `loading.tsx` per route** for instant feedback on client-side navigation,
  built from the same skeleton primitives.
- **An `error.tsx` at the root** so one failed section degrades instead of
  blanking the app.

---

## 11. Setup checklist for a new project

```bash
bun create next-app@latest my-app --typescript --tailwind --app
cd my-app
bun add clsx tailwind-merge
```

1. Replace `app/globals.css` with §3 verbatim.
2. Add the two fonts to `app/layout.tsx` (§4) and put the variables on `<html>`.
3. Add `<ThemeScript />` to `<head>` and `suppressHydrationWarning` on `<html>`.
4. Create `lib/utils.ts` with `cn` (§6.1).
5. Create `components/ui/{panel,button,stat,skeleton}.tsx` from §6.
6. Set `viewport.themeColor` for both schemes (§8).
7. Wrap `main` in `mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8`.
8. For every async section: skeleton first, then `<Suspense>`, then the fetch.

---

## 12. Do / Don't

| Don't | Do |
| --- | --- |
| `shadow-sm`, `shadow-md` | `border border-hairline` |
| `rounded-lg`, `rounded-xl` | square; `rounded-[4px]` only on an active chip |
| `bg-blue-500`, `text-red-600` | `bg-surface-2`, `text-critical`, `var(--color-*)` |
| A brand colour on the primary button | `bg-[var(--color-accent)]` — ink inverts |
| `text-sm` / `text-base` | exact sizes: `text-[13px]`, `text-[15px]` |
| Numbers in the sans face | `.numeral` |
| A section label in sentence case sans | `.eyebrow` |
| Colour-only status | swatch + word |
| Shimmer gradient skeletons | flat `animate-pulse bg-surface-2` |
| One generic full-page spinner | one skeleton per component, shaped to it |
| One `await` for the whole page | one `<Suspense>` per section |
| Charts in the initial bundle | `dynamic(..., { ssr: false })` |
| Dashed chart grid lines | solid `--color-grid`, horizontal only |
| Cycled series colours | fixed slot per metric, for the life of the app |
