import type { Metadata } from "next";
import { Alegreya } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const alegreya = Alegreya({
  weight: "variable",
  style: "normal",
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-vietnamese",
});

export const metadata: Metadata = {
  title: "Thanh | Developer and Creative",
  description:
    "Thanh builds software, documents what he learns, and collects ideas that might become something interesting.",
  icons: {
    icon: "/images/favicon.webp",
    shortcut: "/images/favicon.webp",
    apple: "/images/favicon.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={alegreya.variable} lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
