import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DFEAL Capture",
  description:
    "Internal AI platform for DFEAL LLC — federal and SLED contract intelligence",
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
