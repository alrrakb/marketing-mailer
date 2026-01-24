
import type { Metadata } from "next";
import "./globals.css";

import AuthProvider from "@/components/auth/AuthProvider";
import LanguageProvider from "@/components/providers/LanguageProvider";

export const metadata: Metadata = {
  title: "ALRRAKB Mailer",
  description: "Professional Email Marketing System",
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster position="top-center" richColors />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
