import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import PageFrame from "@/components/PageFrame";
import "./globals.css";

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  title: "GameSetMatch — ATP Match History",
  description:
    "Match histories, stats, and ML performance ratings for every ATP tour-level player since 2000.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={barlow.variable}>
      <body>
        <div className="relative min-h-screen">
          <SiteHeader />
          <PageFrame>{children}</PageFrame>
        </div>
      </body>
    </html>
  );
}
