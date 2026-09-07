import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import Nav from "@/components/Nav";
import SearchBox from "@/components/SearchBox";
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
        <div className="min-h-screen">
          <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
              <Link href="/" className="mr-1" aria-label="GameSetMatch home">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ball.svg" alt="GameSetMatch" className="h-9 w-9 transition hover:rotate-12" />
              </Link>
              <Nav />
              <div className="ml-auto">
                <SearchBox />
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
          <footer className="mx-auto max-w-5xl px-4 pb-8 pt-4 text-xs text-slate-600">
            Data:{" "}
            <a className="underline hover:text-slate-400" href="https://github.com/JeffSackmann/tennis_atp">
              Jeff Sackmann&apos;s tennis_atp
            </a>{" "}
            (CC BY-NC-SA 4.0) with current-season results from{" "}
            <a className="underline hover:text-slate-400" href="http://www.tennis-data.co.uk">
              tennis-data.co.uk
            </a>{" "}
            · ATP tour-level matches since 2000
          </footer>
        </div>
      </body>
    </html>
  );
}
