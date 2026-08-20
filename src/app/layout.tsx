import type { Metadata, Viewport } from "next";
import { AppNav } from "@/components/ui/nav";
import { loadDashboardData } from "@/lib/data/load";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strap — WHOOP dashboard",
  description: "Recovery, strain, sleep and live heart rate from your WHOOP data.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Strap",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  // Prevents the zoom-on-input jump when the dashboard is used as a home-screen app.
  maximumScale: 1,
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The nav badge needs to know whether real data is linked; the layout is the
  // one place that is true for every page.
  const { user } = await loadDashboardData();

  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <AppNav demo={user.demo} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
          <p className="text-[12px] text-muted">
            Past data from the WHOOP API v2 · live heart rate over Bluetooth broadcast
          </p>
        </footer>
      </body>
    </html>
  );
}
