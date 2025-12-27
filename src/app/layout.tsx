import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Card Games - Play Online",
  description: "Play classic card games online - Solitaire, Blackjack, Poker, Hearts, and President. Play against the computer or with friends!",
  manifest: "/cardgames/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Card Games",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Card Games",
    title: "Card Games - Play Online",
    description: "Play classic card games online",
  },
  twitter: {
    card: "summary",
    title: "Card Games - Play Online",
    description: "Play classic card games online",
  },
};

export const viewport: Viewport = {
  themeColor: "#166534",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/cardgames/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/cardgames/icons/icon-192x192.png" />
      </head>
      <body className="font-sans antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
