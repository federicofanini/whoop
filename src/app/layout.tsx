import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { AppNav } from "@/components/ui/nav";
import { getViewer } from "@/server/auth";
import { getLocale, getTranslator } from "@/server/locale";
import { loadFriendGraph } from "@/core/friends/queries";
import { loadViewerDashboard } from "@/server/dashboard";
import { ThemeScript } from "@/components/ui/theme-script";
import { I18nProvider } from "@/components/i18n-provider";
import { getDictionary } from "@/core/i18n";
import "./globals.css";

/*
 * Two faces, doing two jobs.
 *
 * Inter is the closest widely-available neo-grotesque to the tight, low-contrast
 * sans this design calls for, and it is set with `-0.02em` tracking on headings
 * to match. IBM Plex Mono carries every number, label and piece of metadata —
 * the split is the whole typographic idea, so it is worth a second file.
 *
 * next/font self-hosts both, so there is no request to Google at runtime and no
 * layout shift while a webfont arrives.
 */
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

export const metadata: Metadata = {
  title: "Strap — WHOOP dashboard",
  description: "Recovery, strain, sleep and live heart rate from your WHOOP data.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Strap" },
};

export const viewport: Viewport = {
  // Two entries so the browser chrome matches whichever theme is showing.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  // Prevents the zoom-on-input jump when the dashboard is used as a home-screen app.
  maximumScale: 1,
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, t, viewer] = await Promise.all([getLocale(), getTranslator(), getViewer()]);

  // The nav badge needs to know whether real data is linked; the layout is the
  // one place that is true for every page.
  const { user } = await loadViewerDashboard();
  const graph = viewer ? await loadFriendGraph(viewer.profileId) : null;
  const pending = graph?.incoming.length ?? 0;

  return (
    <html
      lang={locale}
      className={`${grotesque.variable} ${monospace.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={locale} dict={getDictionary(locale)}>
          <AppNav
            demo={user.demo}
            locale={locale}
            handle={viewer?.handle ?? null}
            signedIn={Boolean(viewer)}
            pendingRequests={pending}
          />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
          <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
            <p className="text-[12px] text-muted">{t("app.tagline")}</p>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
