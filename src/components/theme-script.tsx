"use client";

import { themeInitScript } from "@/lib/theme/init-script";

/**
 * Server HTML: an executable inline script in <head>, so the saved theme applies before first paint.
 * Browser renders: the same tag as an inert `text/plain` data block. React never executes scripts it
 * creates on the client, and a data block avoids its "Encountered a script tag" error when the root
 * layout re-renders after client navigations or server-action redirects. The attribute differs between
 * server and client on purpose, hence suppressHydrationWarning.
 */
export function ThemeScript() {
  const type = typeof window === "undefined" ? undefined : "text/plain";
  return <script type={type} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
}
