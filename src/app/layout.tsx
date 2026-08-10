import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-context";
import { DevelopmentCacheReset } from "@/components/layout/development-cache-reset";
import { GlobalOverlayProvider } from "@/components/ui/global-overlay-manager";
import { ClientRenderProfiler } from "@/components/performance/client-render-profiler";

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
      <body className="antialiased">
        <ClientRenderProfiler id="GlobalOverlayProvider">
          <GlobalOverlayProvider>
            <ClientRenderProfiler id="ToastProvider">
              <ToastProvider>
                <DevelopmentCacheReset />
                {children}
              </ToastProvider>
            </ClientRenderProfiler>
          </GlobalOverlayProvider>
        </ClientRenderProfiler>
      </body>
    </html>
  );
}
