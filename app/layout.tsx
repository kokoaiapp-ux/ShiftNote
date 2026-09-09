import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ApplicationProviders } from "@/components/ApplicationProviders";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { TikTokPixel } from "@/components/analytics/TikTokPixel";
import { MetaPixel } from "@/components/analytics/MetaPixel";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShiftNote | AI Clinical Copilot",
  description: "A mode-aware AI clinical documentation copilot for healthcare professionals.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GoogleAnalytics />
        <TikTokPixel />
        <MetaPixel />
        <ApplicationProviders>{children}</ApplicationProviders>
      </body>
    </html>
  );
}
