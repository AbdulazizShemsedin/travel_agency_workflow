import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AppLayoutClient } from "@/components/layout/AppLayoutClient";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Travel Agency Management Portal",
  description:
    "Enterprise applicant registration, document verification, processing pipeline and deployment management workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={hankenGrotesk.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-[#090d16] font-sans text-slate-900 dark:text-slate-100 antialiased">
        <QueryProvider>
          <AuthProvider>
            <AppLayoutClient>{children}</AppLayoutClient>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
