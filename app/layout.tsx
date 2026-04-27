import type { Metadata } from "next";
import { Toaster } from "sonner";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "L-Evate Premium Patient Portal",
  description: "Medical booking and onboarding",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: `${siteUrl}/`,
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
