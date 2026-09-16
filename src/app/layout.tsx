import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AppLayoutClient } from "@/components/layout/AppLayoutClient";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Travel Agency Portal",
  description:
    "Register applicants, verify documents, and manage the process.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full max-w-full overflow-x-clip" suppressHydrationWarning>
      <body className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 dark:bg-[#090d16] font-sans text-slate-900 dark:text-slate-100 antialiased">
        <QueryProvider>
          <AuthProvider>
            <AppLayoutClient>{children}</AppLayoutClient>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
