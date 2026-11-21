import type { Metadata, Viewport } from "next";
import { BackgroundField } from "@/components/background-field";
import { SiteHeader } from "@/components/site-header";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AutoShip", template: "%s · AutoShip" },
  description: "Book road, sea, and air capacity for small-business shipments.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The init script sets the theme class before hydration, so server markup differs by design.
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <BackgroundField />
        <SiteHeader />
        <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">{children}</main>
      </body>
    </html>
  );
}
