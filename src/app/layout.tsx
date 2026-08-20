import type { Metadata, Viewport } from "next";
import { AppNav } from "@/components/ui/nav";
import { getViewer } from "@/server/auth";
import { getLocale, getTranslator } from "@/server/locale";
import { loadFriendGraph } from "@/core/friends/queries";
import { loadViewerDashboard } from "@/server/dashboard";
import { ThemeScript } from "@/components/ui/theme-script";
import "./globals.css";

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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh antialiased">
        <AppNav
          demo={user.demo}
          locale={locale}
          handle={viewer?.handle ?? null}
          signedIn={Boolean(viewer)}
          pendingRequests={pending}
          labels={{
            overview: t("nav.overview"),
            recovery: t("nav.recovery"),
            strain: t("nav.strain"),
            sleep: t("nav.sleep"),
            friends: t("nav.friends"),
            live: t("nav.live"),
            settings: t("nav.settings"),
            signIn: t("nav.signIn"),
            demoBadge: t("nav.demoBadge"),
            demoTitle: t("nav.demoTitle"),
            theme: t("nav.theme"),
            themeLight: t("nav.themeLight"),
            themeDark: t("nav.themeDark"),
            themeSystem: t("nav.themeSystem"),
            language: t("nav.language"),
            pendingLabel:
              pending === 1
                ? t("nav.pendingRequests", { count: pending })
                : t("nav.pendingRequests_plural", { count: pending }),
          }}
        />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
          <p className="text-[12px] text-muted">{t("app.tagline")}</p>
        </footer>
      </body>
    </html>
  );
}
