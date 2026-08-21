import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { AppNav } from "@/components/ui/nav";
import { AccountLinkSkeleton } from "@/components/nav/account-link";
import { AccountSlot, DemoSlot, FriendsBadge } from "@/components/nav/slots";
import { getLocale, getTranslator } from "@/server/locale";
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

/**
 * The shell, and nothing that needs a query.
 *
 * A layout is the outermost thing React renders, so anything awaited here is
 * awaited before the browser receives a single byte of the document — no
 * streaming, no early stylesheet or font fetch, no skeletons. That is why the
 * only things resolved up front are the locale and its dictionary, both of
 * which come from a cookie and a static import. Everything the header needs
 * from the database is streamed in as a slot.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslator()]);

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
            locale={locale}
            demoSlot={
              <Suspense fallback={null}>
                <DemoSlot />
              </Suspense>
            }
            friendsBadge={
              <Suspense fallback={null}>
                <FriendsBadge />
              </Suspense>
            }
            accountSlot={
              <Suspense fallback={<AccountLinkSkeleton />}>
                <AccountSlot />
              </Suspense>
            }
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
