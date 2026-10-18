import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "abtest-lab",
  description: "A mini experimentation platform for a demo e-commerce store.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col font-sans">
        <CartProvider>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
          <footer className="py-8 text-center text-xs text-zinc-400">
            abtest-lab — fictional store, fictional products, simulated purchases.
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
