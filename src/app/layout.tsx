import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-display", weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "entiquity — Entity management, intelligently organized.",
  description:
    "entiquity helps law firms and legal teams manage entities, filings, ownership records, documents, deadlines, and resolutions in one secure AI-powered workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
