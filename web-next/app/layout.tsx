import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import PageFrame from "@/components/PageFrame";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameSetMatch — ATP Match History",
  description:
    "Match histories, stats, and ML performance ratings for every ATP tour-level player since 2000.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="relative min-h-screen">
          <SiteHeader />
          <PageFrame>{children}</PageFrame>
        </div>
      </body>
    </html>
  );
}
