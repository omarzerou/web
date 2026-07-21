import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "DeliveryPro — Pide comida a domicilio",
  description: "Pide comida de tus restaurantes favoritos y recíbela en minutos. Kebabs, hamburguesas, pizza y mucho más.",
};

import { Toaster } from 'react-hot-toast';
import { ConfirmProvider } from '@/components/ConfirmProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConfirmProvider>
          {children}
          <Toaster position="bottom-right" toastOptions={{
            style: {
              borderRadius: '12px',
              background: '#333',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
            },
          }}/>
        </ConfirmProvider>
      </body>
    </html>
  );
}
