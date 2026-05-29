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
    <div className="relative min-h-screen bg-[#050606] text-slate-200 overflow-x-hidden font-sans"
      style={{
        background: "radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.04) 0%, #050606 100%), linear-gradient(to right, rgba(20, 184, 166, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(20, 184, 166, 0.02) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 45px 45px, 45px 45px"
      }}
    >
      {/* Background ambient lights - Aurora style combining Sea Green and Yellow/Gold */}
      <div className="absolute top-[-10%] left-[-10%] w-[65vw] h-[65vw] rounded-full bg-teal-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-teal-600/5 blur-[120px] pointer-events-none" />

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1100px] flex items-center justify-between p-3 md:py-3.5 md:px-7 z-50 rounded-2xl bg-[#0a0c0c]/85 backdrop-blur-xl border border-teal-500/15 shadow-2xl shadow-black/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-950/90 border border-amber-500/25 rounded-xl flex items-center justify-center shadow-lg shadow-black/50">
            <Logo width={26} height={26} />
          </div>
          <span className="text-base md:text-xl font-black tracking-tight font-display flex items-center gap-1">
            <span className="text-slate-50">ATUL</span>
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-md">Residency</span>
          </span>
        </div>

        <Link href="/login" className="py-2 px-4 md:py-2.5 md:px-6 text-xs md:text-sm font-extrabold bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 rounded-xl hover:from-amber-400 hover:to-amber-600 transition-all duration-300 shadow-md shadow-amber-500/10 active:scale-95 text-center decoration-transparent">
          Portal Login
        </Link>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-4 md:px-6 pt-32 md:pt-44 pb-16 min-h-screen">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-full px-4 py-1.5 text-[10px] md:text-xs font-bold text-amber-500 tracking-wider mb-6 md:mb-8 shadow-md shadow-amber-500/5">
          <Star size={10} fill="#FFA751" color="#FFA751" />
          PREMIUM MANAGEMENT SYSTEM
          <Star size={10} fill="#FFA751" color="#FFA751" />
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-tight max-w-4xl font-display">
          <span className="text-slate-50">Welcome to</span>
          <br />
          <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-lg shadow-amber-500/10">ATUL Residency</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl mb-10 px-2">
          Experience Premium Residency & Smart Automation.
          Managing rent collection, WhatsApp reminders, PDF invoices, and maintenance requests via a unified interface.
        </p>

        {/* Unified CTA */}
        <div>
          <Link href="/login" className="py-3.5 px-8 md:py-4 md:px-10 text-sm md:text-base font-extrabold text-slate-950 bg-gradient-to-r from-teal-400 to-teal-600 rounded-xl hover:from-teal-300 hover:to-teal-500 transition-all duration-300 shadow-lg shadow-teal-500/20 inline-flex items-center gap-2 active:scale-95 decoration-transparent">
            Portal Login
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Real-time stats preview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-16 md:mt-24 w-full max-w-5xl px-2">
          {(data?.towerStats || [
            { name: "Tower A", totalRooms: 19, occupiedRooms: 0 },
            { name: "Tower B", totalRooms: 15, occupiedRooms: 0 }
          ]).map((t) => {
            const pct = t.totalRooms > 0 ? (t.occupiedRooms / t.totalRooms) * 100 : 0;
            return (
              <div
                key={t.name}
                className="p-5 md:p-6 text-left bg-slate-950/60 border border-teal-500/10 rounded-2xl backdrop-blur-md shadow-xl transition-all duration-300 hover:border-amber-500/35 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/5 group"
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 bg-teal-500/5 border border-teal-500/20 rounded-xl flex items-center justify-center group-hover:border-amber-500/30 transition-colors">
                    <Building size={16} className="text-amber-500" />
                  </div>
                  <span className="font-extrabold text-sm md:text-base text-slate-50">{t.name}</span>
                </div>
                <div className="text-2xl md:text-3xl font-black text-slate-50 font-mono">
                  {t.occupiedRooms}
                  <span className="text-sm md:text-base text-slate-500 font-normal">/{t.totalRooms}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Occupied Rooms</div>
                <div className="mt-4 w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ STATS COUNTERS ═══ */}
      <section className="px-4 md:px-6 py-10 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 bg-slate-950/50 border border-teal-500/15 rounded-3xl backdrop-blur-xl overflow-hidden divide-y divide-x divide-teal-500/10 md:divide-y-0">
            {[
              { label: "Rooms Managed", value: data?.totalRooms || 0, prefix: "", suffix: "" },
              { label: "Vacant Rooms", value: data?.vacantRooms || 0, prefix: "", suffix: "" },
              { label: "Occupied Rooms", value: data?.occupiedRooms || 0, prefix: "", suffix: "" },
              { label: "Towers Managed", value: data?.totalTowers || 0, prefix: "", suffix: "" },
            ].map((stat) => (
              <div key={stat.label} className="p-6 md:p-8 text-center flex flex-col justify-center items-center">
                <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent font-mono">
                  {mounted && <AnimatedNumber target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />}
                </div>
                <div className="text-[10px] md:text-xs text-teal-400 font-bold tracking-wider uppercase mt-2">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="py-20 px-4 md:px-6 relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-4xl font-black mb-4 bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent font-display">
            Management Capabilities
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Automating your property administrative pipeline from renting contracts to bills collections.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 bg-slate-900/20 border border-teal-500/5 rounded-2xl hover:border-teal-500/25 hover:bg-slate-900/40 hover:-translate-y-1 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/5 flex flex-col text-left"
            >
              <div className="w-10 h-10 bg-teal-500/5 border border-teal-500/15 rounded-xl flex items-center justify-center mb-4">
                <f.icon size={18} className="text-teal-400" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-50 mb-2">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="py-16 px-4 md:px-6 relative z-10 max-w-4xl mx-auto text-center">
        <div className="p-8 sm:p-14 bg-gradient-to-r from-teal-500/10 to-teal-700/5 border border-teal-500/20 rounded-3xl backdrop-blur-md shadow-2xl shadow-teal-500/5">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4 font-display">
            Property Portals Redefined
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto mb-8">
            Sign in to manage your rented property stats, inspect bills, or execute automation reminders instantly.
          </p>
          <div>
            <Link href="/login" className="py-3.5 px-8 md:py-4 md:px-10 text-sm md:text-base font-extrabold text-slate-950 bg-gradient-to-r from-teal-400 to-teal-600 rounded-xl hover:from-teal-300 hover:to-teal-500 transition-all duration-300 shadow-md shadow-teal-500/10 active:scale-95 inline-flex items-center gap-2 decoration-transparent">
              Enter Portal
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-teal-500/10 py-10 px-4 text-center text-slate-500 text-xs sm:text-sm leading-relaxed relative z-10">
        © 2026 ATUL Residency. All rights reserved.
        <br />
        Built by <a href="mailto:prashantmnaitripathi2003@gmail.com" className="text-amber-400 hover:text-amber-300 transition-colors font-bold decoration-transparent">Prashant Mani Tripathi</a> for ATUL Residency.
        <br />
        <span className="text-[10px] sm:text-xs text-teal-600/60 mt-1 block">UPI: atultiwari123321@oksbi | Phone: +91 6392651108</span>
      </footer>
    </div>
  );
}
