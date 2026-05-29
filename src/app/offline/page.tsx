"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function OfflinePage() {
  const [checking, setChecking] = useState(false);

  const handleRetry = () => {
    setChecking(true);
    // Use navigator.onLine check
    if (typeof window !== "undefined") {
      if (navigator.onLine) {
        toast.success("Connection restored! Reconnecting... 🌐");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else {
        setTimeout(() => {
          toast.error("Still offline. Please check your internet connection.");
          setChecking(false);
        }, 800);
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050606",
        color: "#e2e8f0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-sans, sans-serif)",
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(20, 184, 166, 0.08) 0%, rgba(255, 226, 89, 0.02) 50%, transparent 100%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        className="glass-card"
        style={{
          maxWidth: "420px",
          width: "100%",
          padding: "40px 30px",
          textAlign: "center",
          borderRadius: "16px",
          position: "relative",
          zIndex: 1,
          border: "1px solid rgba(20, 184, 166, 0.15)",
          background: "rgba(10, 10, 22, 0.8)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <Logo width={70} height={70} glow={true} />
        </div>

        <div
          style={{
            width: "56px",
            height: "56px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <WifiOff size={24} color="#ef4444" />
        </div>

        <h1
          style={{
            fontSize: "22px",
            fontWeight: 800,
            marginBottom: "12px",
            color: "#ffffff",
            fontFamily: "var(--font-display, sans-serif)",
            letterSpacing: "-0.5px",
          }}
        >
          Connection Lost
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "rgba(226, 232, 240, 0.6)",
            lineHeight: "1.6",
            marginBottom: "30px",
          }}
        >
          It looks like you are currently offline. Atul Residency portal requires an internet connection to sync real-time rent records and messaging.
        </p>

        <button
          onClick={handleRetry}
          disabled={checking}
          className="btn-primary"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "12px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <RefreshCw size={16} className={checking ? "animate-spin" : ""} style={{ marginRight: "8px" }} />
          {checking ? "Checking..." : "Retry Connection"}
        </button>

        <p
          style={{
            fontSize: "11px",
            color: "rgba(226, 232, 240, 0.4)",
            marginTop: "24px",
          }}
        >
          © 2026 ATUL Residency. Premium Property Portal.
        </p>
      </div>
    </div>
  );
}
