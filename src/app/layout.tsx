import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";
import Chatbot from "@/components/Chatbot";
import PWARegister from "@/components/PWARegister";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export const metadata: Metadata = {
  title: "Atul Residency — Premium Property Management",
  description: "Smart property management system for Atul Residency. Manage rent, renters, maintenance, and payments seamlessly.",
  keywords: "property management, rent tracker, renter management, Atul Residency",
  authors: [{ name: "Atul Tiwari" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon-32x32.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Atul Residency",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Atul Residency",
    description: "Premium Property Management System",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#14B8A6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "rgba(13, 13, 31, 0.95)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  color: "#e2e8f0",
                },
              }}
            />
            <Chatbot />
            <PWARegister />
            <PWAInstallPrompt />
            <Script id="register-sw" strategy="afterInteractive">
              {`
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                      console.log('Service Worker registered with scope:', reg.scope);
                    }).catch(function(err) {
                      console.error('Service Worker registration failed:', err);
                    });
                  });
                }
              `}
            </Script>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
