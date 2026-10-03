import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inside the Game — Explainable Match Intelligence",
  description: "A synthetic, explainable football match intelligence demo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
