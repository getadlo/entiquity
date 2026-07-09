import type { Metadata } from "next";
import { Montserrat, Lora } from "next/font/google";
import "./globals.css";

const sans = Montserrat({ subsets: ["latin"], variable: "--font-sans" });
const display = Lora({ subsets: ["latin"], variable: "--font-display", weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "entiquity — Entity management, intelligently organized.",
  description:
    "entiquity helps law firms and legal teams manage entities, filings, ownership records, documents, deadlines, and resolutions in one secure AI-powered workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
