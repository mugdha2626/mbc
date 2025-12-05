import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FarcasterProvider } from "./providers/FarcasterProvider";
import { WagmiProviderWrapper } from "./providers/WagmiProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Base URL for assets - update this for production
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tmap.app";

export const metadata: Metadata = {
  title: "tmap - Social Map of Food Culture",
  description: "Discover, mint, and trade food culture Stamps",
  openGraph: {
    title: "tmap - Social Map of Food Culture",
    description: "Discover, mint, and trade food culture Stamps",
    images: [`${APP_URL}/og-image.png`],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "1",
      imageUrl: `${APP_URL}/og-image.png`,
      button: {
        title: "Open tmap",
        action: {
          type: "launch_frame",
          name: "tmap",
          url: APP_URL,
          splashImageUrl: `${APP_URL}/splash.png`,
          splashBackgroundColor: "#16a34a",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <WagmiProviderWrapper>
          <FarcasterProvider>{children}</FarcasterProvider>
        </WagmiProviderWrapper>
      </body>
    </html>
  );
}
