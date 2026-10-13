import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "A fan site for Song Xinran (Ranran) of SNH48: team history, Senbatsu elections, a quiz, a photocard maker and a guestbook.";

export const metadata: Metadata = {
  // Isi NEXT_PUBLIC_SITE_URL dengan domain asli saat deploy, supaya link
  // gambar preview (Open Graph) benar. Di Vercel, domain produksi dipakai otomatis.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: {
    default: "Song Xinran · SNH48 Fan Site",
    template: "%s · Song Xinran",
  },
  description,
  openGraph: {
    title: "Song Xinran · SNH48 Fan Site",
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Song Xinran · SNH48 Fan Site",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // Ekstensi browser (mis. QuillBot) menambah atribut ke <html> sebelum React jalan.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
