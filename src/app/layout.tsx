import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/site-header";
import { themeInitScript } from "@/lib/theme/init-script";
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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      </body>
    </html>
  );
}
