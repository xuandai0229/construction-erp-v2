import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-context";
import { DevelopmentCacheReset } from "@/components/layout/development-cache-reset";
import { GlobalOverlayProvider } from "@/components/ui/global-overlay-manager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ERP Công trình",
  description: "Phần mềm quản lý xây dựng",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <GlobalOverlayProvider>
          <ToastProvider>
            <DevelopmentCacheReset />
            {children}
          </ToastProvider>
        </GlobalOverlayProvider>
      </body>
    </html>
  );
}
