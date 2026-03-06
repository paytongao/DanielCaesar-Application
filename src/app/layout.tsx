import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";
import ScrollContainer from "@/components/layout/ScrollContainer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Chromesthesia — Daniel Caesar Visualized",
  description: "An interactive visualization of chromesthesia through Daniel Caesar's music. See the colors I hear.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-white`}
      >
        <ScrollContainer>
          <Navigation />
          <main className="pt-16">
            {children}
          </main>
        </ScrollContainer>
      </body>
    </html>
  );
}
