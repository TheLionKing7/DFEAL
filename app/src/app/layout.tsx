import type { Metadata } from "next";
import { SMART_CAPTURE } from "@/config/platform";
import "./globals.css";

export const metadata: Metadata = {
  title: SMART_CAPTURE.name,
  description: `${SMART_CAPTURE.tagline} — capture workspace for government contractors`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg text-text">{children}</body>
    </html>
  );
}
