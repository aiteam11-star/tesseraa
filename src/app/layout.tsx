import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { VerifyBanner } from "@/components/VerifyBanner";

export const metadata: Metadata = {
  title: { default: "Tessera: briefs that become matches", template: "%s · Tessera" },
  description: "Describe a project in your own words. Tessera structures the brief, matches freelancers honestly and watches scope and budget.",
};

// Runs before paint so dark mode never flashes. Falls back to the system setting.
const themeScript = `try{var t=localStorage.getItem('tessera-theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-bg">
          Skip to content
        </a>
        <Providers>
          <Header />
          <VerifyBanner />
          <main id="main" className="mx-auto min-h-[70vh] max-w-6xl px-4 py-8 sm:px-6">
            {children}
          </main>
          <footer className="border-t border-line py-6 text-center text-xs text-muted">
            Profiles and projects marked “Sample” are fictional examples. · <a href="/terms" className="underline underline-offset-4">Terms and privacy</a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
