"use client";

import Link from "next/link";
import { Building, ArrowRight, Shield, Zap, Users, IndianRupee, Bell, FileText, Smartphone, Star } from "lucide-react";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

function AnimatedNumber({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setCurrent(Math.min(Math.round(increment * step), target));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{prefix}{current.toLocaleString("en-IN")}{suffix}</span>;
}

const features = [
  { icon: IndianRupee, title: "Smart Rent Tracker", desc: "Auto-generate monthly rent cycles, track paid/pending/overdue with one click" },
  { icon: Bell, title: "WhatsApp Automation", desc: "Auto-send invoices & reminders on WhatsApp. No more manual calls on 1st!" },
  { icon: Users, title: "Renter Management", desc: "Secure photo & Aadhaar storage. Full renter profiles at your fingertips" },
  { icon: FileText, title: "PDF Invoices", desc: "Premium rent receipts auto-generated and shared via WhatsApp instantly" },
  { icon: Zap, title: "Real-time Dashboard", desc: "Live analytics, revenue charts, occupancy stats — all in one place" },
  { icon: Shield, title: "Secure & Private", desc: "JWT auth, encrypted Aadhaar, role-based access. Your data is protected" },
  { icon: Smartphone, title: "Mobile Friendly", desc: "Perfectly responsive — works on mobile, tablet, and desktop" },
  { icon: Building, title: "Multi-Tower Support", desc: "Tower A, B, C, D... add unlimited towers as your property grows" },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<{
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    totalTowers: number;
    towerStats: Array<{ name: string; totalRooms: number; occupiedRooms: number; vacantRooms: number }>;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    
    function fetchStats() {
      fetch(`/api/public-stats?t=${Date.now()}`, { cache: "no-store" })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((resData) => {
          setData(resData);
        })
        .catch(() => {});
    }

    fetchStats();
    // Poll public database statistics every 4 seconds to keep in sync with admin updates
    const interval = setInterval(fetchStats, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.04) 0%, #050606 100%), linear-gradient(to right, rgba(20, 184, 166, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(20, 184, 166, 0.02) 1px, transparent 1px)",
      backgroundSize: "100% 100%, 45px 45px, 45px 45px",
      position: "relative",
      overflow: "hidden",
      color: "#e2e8f0",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Background ambient lights - Aurora style combining Sea Green and Yellow/Gold */}
      <div className="orb orb-1" style={{ position: "absolute", filter: "blur(150px)", opacity: 0.28, background: "radial-gradient(circle, #14B8A6, transparent)", top: "-10%", left: "-10%", width: "65vw", height: "65vw", pointerEvents: "none" }} />
      <div className="orb orb-2" style={{ position: "absolute", filter: "blur(150px)", opacity: 0.14, background: "radial-gradient(circle, #FFE259, transparent)", bottom: "-10%", right: "-10%", width: "55vw", height: "55vw", pointerEvents: "none" }} />
      <div className="orb orb-3" style={{ position: "absolute", filter: "blur(120px)", opacity: 0.12, background: "radial-gradient(circle, #0d9488, transparent)", top: "40%", left: "30%", width: "40vw", height: "40vw", pointerEvents: "none" }} />

      {/* ═══ NAVBAR ═══ */}
      <nav
        className="fixed top-4 md:top-5 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] md:w-[calc(100%-40px)] max-w-[1100px] flex items-center justify-between px-4 py-2.5 md:px-7 md:py-3.5 z-50 rounded-[16px] md:rounded-[20px] bg-[#0a0c0c]/85 backdrop-blur-[24px] border border-[#14B8A6]/15 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-2 md:gap-3.5">
          <div
            className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] flex items-center justify-center border border-[#f59e0b]/25 bg-gradient-to-br from-[#0f1111]/90 to-[#050606]/95 shadow-[0_4px_15px_rgba(0,0,0,0.5),_inset_0_1px_0_rgba(255,255,255,0.05),_0_0_12px_rgba(245,158,11,0.15)]"
          >
            <div className="block md:hidden">
              <Logo width={22} height={22} />
            </div>
            <div className="hidden md:block">
              <Logo width={28} height={28} />
            </div>
          </div>
          <span className="text-sm sm:text-base md:text-xl font-extrabold tracking-[-0.5px] font-['Poppins',sans-serif]">
            <span style={{ color: "#f8fafc" }}>ATUL </span>
            <span style={{ background: "linear-gradient(135deg, #FFE259 0%, #FFA751 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "0px 2px 10px rgba(255, 167, 81, 0.2)" }}>Residency</span>
          </span>
        </div>

        <Link href="/login" className="px-4 py-2 md:px-6 md:py-2.5 text-[11px] md:text-xs font-extrabold rounded-lg md:rounded-[10px] bg-gradient-to-br from-[#FFE259] to-[#FFA751] text-[#050606] no-underline shadow-[0_4px_15px_rgba(255,167,81,0.25)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0">
          Portal Login
        </Link>
      </nav>

      {/* ═══ HERO ═══ */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "140px 24px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(245, 158, 11, 0.05)",
            border: "1px solid rgba(245, 158, 11, 0.22)",
            borderRadius: "999px",
            padding: "6px 16px",
            fontSize: "12px",
            fontWeight: 700,
            color: "#FFA751",
            letterSpacing: "0.5px",
            marginBottom: "32px",
            boxShadow: "0 4px 20px rgba(245, 158, 11, 0.05)"
          }}
        >
          <Star size={12} fill="#FFA751" color="#FFA751" />
          PREMIUM MANAGEMENT SYSTEM
          <Star size={12} fill="#FFA751" color="#FFA751" />
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(38px, 6.5vw, 76px)",
            maxWidth: "900px",
            marginBottom: "24px",
            lineHeight: 1.1,
            fontWeight: 900,
            letterSpacing: "-1.5px",
            fontFamily: "'Poppins', sans-serif"
          }}
        >
          <span style={{ color: "#f8fafc" }}>Welcome to</span>
          <br />
          <span style={{ background: "linear-gradient(135deg, #FFE259 0%, #FFA751 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "0px 3px 25px rgba(255,167,81,0.25)" }}>ATUL Residency</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(15px, 2vw, 18px)",
            color: "rgba(226, 232, 240, 0.6)",
            maxWidth: "640px",
            lineHeight: 1.7,
            marginBottom: "40px",
          }}
        >
          Experience Premium Residency & Smart Automation.
          Managing rent collection, WhatsApp reminders, PDF invoices, and maintenance requests via a unified interface.
        </p>

        {/* Unified CTA */}
        <div>
          <Link href="/login" style={{ padding: "16px 40px", fontSize: "16px", background: "linear-gradient(135deg, #20B2AA 0%, #14B8A6 100%)", color: "#050606", borderRadius: "14px", textDecoration: "none", fontWeight: 800, boxShadow: "0 10px 30px rgba(20, 184, 166, 0.3)", display: "inline-flex", alignItems: "center", gap: "10px", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            Portal Login
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Real-time stats preview cards */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "80px",
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
            maxWidth: "960px",
          }}
        >
          {(data?.towerStats || [
            { name: "Tower A", totalRooms: 19, occupiedRooms: 0 },
            { name: "Tower B", totalRooms: 15, occupiedRooms: 0 }
          ]).map((t) => {
            const pct = t.totalRooms > 0 ? (t.occupiedRooms / t.totalRooms) * 100 : 0;
            return (
              <div
                key={t.name}
                style={{ 
                  padding: "24px", 
                  minWidth: "220px", 
                  flex: "1 1 200px",
                  textAlign: "left",
                  background: "rgba(15, 17, 17, 0.7)",
                  border: "1px solid rgba(20, 184, 166, 0.15)",
                  borderRadius: "20px",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 15px 35px -5px rgba(0,0,0,0.5)",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = "rgba(255, 226, 89, 0.35)";
                  e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.6), 0 0 15px rgba(255, 226, 89, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.15)";
                  e.currentTarget.style.boxShadow = "0 15px 35px -5px rgba(0,0,0,0.5)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      background: "rgba(20, 184, 166, 0.08)",
                      border: "1px solid rgba(20, 184, 166, 0.25)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Building size={18} color="#FFA751" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "#f8fafc" }}>{t.name}</span>
                </div>
                <div style={{ fontSize: "32px", fontWeight: 900, color: "#f8fafc", fontFamily: "monospace" }}>
                  {t.occupiedRooms}
                  <span style={{ fontSize: "16px", color: "rgba(226,232,240,0.35)", fontWeight: 400 }}>/{t.totalRooms}</span>
                </div>
                <div style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "4px" }}>Occupied Rooms</div>
                <div style={{ marginTop: "16px", width: "100%", height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, background: "linear-gradient(90deg, #FFE259, #FFA751)", height: "100%", borderRadius: "3px" }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ STATS COUNTERS ═══ */}
      <section style={{ padding: "40px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0",
              background: "rgba(10, 12, 12, 0.6)",
              border: "1px solid rgba(20, 184, 166, 0.15)",
              borderRadius: "24px",
              backdropFilter: "blur(20px)",
              overflow: "hidden",
            }}
          >
            {[
              { label: "Rooms Managed", value: data?.totalRooms || 0, prefix: "", suffix: "" },
              { label: "Vacant Rooms", value: data?.vacantRooms || 0, prefix: "", suffix: "" },
              { label: "Occupied Rooms", value: data?.occupiedRooms || 0, prefix: "", suffix: "" },
              { label: "Towers Managed", value: data?.totalTowers || 0, prefix: "", suffix: "" },
            ].map((stat, i, arr) => (
              <div
                key={stat.label}
                className="py-8 px-4 md:py-9 md:px-6 border-b md:border-b-0 md:border-r last:border-b-0 last:border-r-0 border-[#14B8A6]/10 border-solid"
                style={{
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "38px",
                    fontWeight: 900,
                    background: "linear-gradient(135deg, #FFE259, #FFA751)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontFamily: "monospace"
                  }}
                >
                  {mounted && <AnimatedNumber target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(20, 184, 166, 0.8)", marginTop: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2
              style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 900, marginBottom: "16px", background: "linear-gradient(135deg, #20B2AA 0%, #14B8A6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Poppins', sans-serif" }}
            >
              Management Capabilities
            </h2>
            <p style={{ color: "rgba(226,232,240,0.5)", fontSize: "16px", maxWidth: "520px", margin: "0 auto", lineHeight: "1.5" }}>
              Automating your property administrative pipeline from renting contracts to bills collections
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
            }}
          >
            {features.map((f, i) => (
              <div
                key={f.title}
                style={{
                  padding: "28px",
                  background: "rgba(15, 17, 17, 0.5)",
                  border: "1px solid rgba(20, 184, 166, 0.08)",
                  borderRadius: "20px",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.35)";
                  e.currentTarget.style.background = "rgba(15, 17, 17, 0.8)";
                  e.currentTarget.style.boxShadow = "0 10px 25px rgba(20, 184, 166, 0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.08)";
                  e.currentTarget.style.background = "rgba(15, 17, 17, 0.5)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "rgba(20, 184, 166, 0.08)",
                    border: "1px solid rgba(20, 184, 166, 0.15)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <f.icon size={22} color="#14B8A6" />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px", color: "#f8fafc" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)", lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section style={{ padding: "60px 24px 120px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              padding: "56px 48px",
              background: "linear-gradient(135deg, rgba(20, 184, 166, 0.16) 0%, rgba(13, 148, 136, 0.04) 100%)",
              border: "1px solid rgba(20, 184, 166, 0.25)",
              borderRadius: "28px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.55), 0 0 30px rgba(20, 184, 166, 0.08)"
            }}
          >
            <h2 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "16px", color: "#f8fafc", fontFamily: "'Poppins', sans-serif" }}>
              Property Portals Redefined
            </h2>
            <p style={{ color: "rgba(226,232,240,0.55)", marginBottom: "32px", fontSize: "15px", lineHeight: "1.5" }}>
              Sign in to manage your rented property stats, inspect bills, or execute automation reminders instantly.
            </p>
            <div>
              <Link href="/login" style={{ padding: "16px 40px", fontSize: "15px", background: "linear-gradient(135deg, #20B2AA 0%, #14B8A6 100%)", color: "#050606", borderRadius: "12px", textDecoration: "none", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "8px", boxShadow: "0 6px 20px rgba(20, 184, 166, 0.25)" }}>
                Enter Portal
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (including requested copyright details) */}
      <footer
        style={{
          borderTop: "1px solid rgba(20, 184, 166, 0.1)",
          padding: "36px 24px",
          textAlign: "center",
          color: "rgba(226,232,240,0.3)",
          fontSize: "13px",
          position: "relative",
          zIndex: 1,
          lineHeight: "1.8"
        }}
      >
        © 2026 ATUL Residency. All rights reserved.
        <br />
        Built by <a href="mailto:prashantmnaitripathi2003@gmail.com" style={{ color: "#FFE259", textDecoration: "none", fontWeight: 600 }}>Prashant Mani Tripathi</a> for ATUL Residency.
        <br />
        <span style={{ fontSize: "11px", color: "rgba(20, 184, 166, 0.4)" }}>UPI: atultiwari123321@oksbi | Phone: +91 6392651108</span>
      </footer>
    </div>
  );
}
