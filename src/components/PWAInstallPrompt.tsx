"use client";

import { useState, useEffect } from "react";
import { X, Smartphone, Download, Share, Sparkles } from "lucide-react";
import Logo from "./Logo";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop" | null>(null);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Check if the app is already running in standalone mode (installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Determine platform
    const ua = navigator.userAgent;
    const isMobileIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isMobileAndroid = /Android/i.test(ua);
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(ua);

    setIsSafari(isSafariBrowser);

    if (isMobileIOS) {
      setPlatform("ios");
    } else if (isMobileAndroid) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Check if user dismissed it in this session to avoid annoyance
    const dismissedThisSession = sessionStorage.getItem("pwa_install_dismissed");
    if (dismissedThisSession === "true") {
      return;
    }

    // Listen for beforeinstallprompt event (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // For iOS Safari, show the prompt after a slight delay since beforeinstallprompt doesn't fire
    if (isMobileIOS && isSafariBrowser) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Wait 5 seconds to not overwhelm the user immediately
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native browser installation prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Installation outcome: ${outcome}`);

    // We no longer need the prompt, clear it
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa_install_dismissed", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-8 duration-300 md:bottom-6 md:right-6 md:left-auto">
      {/* Glassmorphic luxury container */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-slate-950/90 p-5 text-slate-100 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-teal-500/30">
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[size:14px_24px]" />
        
        {/* Radial ambient glow in the top-right corner */}
        <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-teal-500/10 blur-xl" />
        
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-4">
          <div className="flex-shrink-0 bg-slate-900/60 p-2.5 rounded-xl border border-teal-500/10">
            <Logo width={40} height={40} />
          </div>

          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <h3 className="font-semibold text-sm tracking-wide text-white uppercase">Install PWA Portal</h3>
            </div>
            <h4 className="mt-1 font-bold text-base text-teal-400">ATUL Residency App</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Install the app for instant updates, faster speeds, offline access, and lockscreen push notifications.
            </p>

            {/* Platform-specific actions */}
            {platform === "ios" ? (
              <div className="mt-3.5 rounded-lg bg-teal-950/30 border border-teal-500/10 p-3 text-[11px] text-slate-300">
                <p className="flex items-center gap-1.5 font-medium text-teal-300">
                  <Smartphone className="h-3.5 w-3.5" /> iOS Safari Installation Guide:
                </p>
                <ol className="mt-1.5 list-decimal pl-4 space-y-1">
                  <li>
                    Tap the <strong className="text-white inline-flex items-center gap-0.5">Share <Share className="inline h-3 w-3" /></strong> button in the browser toolbar.
                  </li>
                  <li>
                    Scroll down and select <strong className="text-white">Add to Home Screen</strong>.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition-all duration-300 hover:from-teal-400 hover:to-emerald-400 active:scale-95 shadow-md shadow-teal-500/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Install Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Later
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
