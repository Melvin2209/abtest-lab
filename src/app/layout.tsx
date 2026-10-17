import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "abtest-lab",
  description: "A mini experimentation platform for a demo e-commerce store.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
