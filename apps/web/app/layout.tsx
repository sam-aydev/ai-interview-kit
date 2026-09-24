import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TraoPrep.ai | Next-Generation Interview Intelligence",
    // %s is replaced by the specific title of child pages
    template: "%s | TraoPrep.ai",
  },
  description:
    "Autonomously crawl company engineering blogs, extract hidden requirements, and generate a day-by-day interview study itinerary.",
  keywords: [
    "AI interview prep",
    "coding interview",
    "software engineer prep",
    "study itinerary",
    "flashcards",
    "tech interview",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
