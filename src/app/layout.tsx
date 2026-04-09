import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Courant Transaction Tracker",
  description: "Private transaction tracking for Courant Pty Ltd.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              const saved = localStorage.getItem('theme');
              const theme = saved === 'light' || saved === 'dark'
                ? saved
                : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
              document.documentElement.dataset.theme = theme;
            } catch {}
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
