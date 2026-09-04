import type { Metadata } from "next";
import "./globals.css";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
