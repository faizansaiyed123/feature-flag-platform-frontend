import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flagship — Feature Flag Platform",
  description: "Developer-first feature flag management, targeting, rollouts, and evaluation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
