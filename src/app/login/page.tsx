"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye, EyeOff, Loader2, Smartphone, Mail, CheckCircle, RefreshCw, Key
} from "lucide-react";
import { toast } from "sonner";
import { Suspense } from "react";
import Logo from "@/components/Logo";

type LoginMode = "password" | "otp";
type OtpStep = "phone" | "verify";

function LoginPageContent() {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password login state
  const [loginData, setLoginData] = useState({ identifier: "", password: "" });

  // OTP login state
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // --- Password Login ---
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginData.identifier || !loginData.password) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        identifier: loginData.identifier,
        password: loginData.password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Invalid credentials. Please verify your login details.");
      } else {
        toast.success("Welcome back! 🎉");
        // Fetch session to determine role dynamically
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const role = session?.user?.role;
        router.push(role === "ADMIN" ? "/admin/dashboard" : "/tenant/dashboard");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // --- Send OTP ---
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier) {
      toast.error("Enter a registered email or 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send OTP");
        return;
      }
      toast.success("OTP sent successfully!");
      if (data.devOtp) {
        toast.info(`Simulation Mode: Your OTP is ${data.devOtp}`, { duration: 15000 });
      }
      setOtpStep("verify");
      setResendTimer(30);
      const interval = setInterval(() => {
        setResendTimer((t) => {
          if (t <= 1) { clearInterval(interval); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // --- Verify OTP and Login ---
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "OTP verification failed");
        return;
      }

      const result = await signIn("credentials", {
        otpVerified: "true",
        userId: data.userId,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Login failed. Please try again.");
      } else {
        toast.success("Logged in successfully! 🎉");
        const role = data.role;
        router.push(role === "ADMIN" ? "/admin/dashboard" : "/tenant/dashboard");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function resetOtp() {
    setOtpStep("phone");
    setOtp("");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.04) 0%, #050606 100%), linear-gradient(to right, rgba(20, 184, 166, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(20, 184, 166, 0.02) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 45px 45px, 45px 45px",
        fontFamily: "'Outfit', sans-serif"
      }}
    >
      {/* Background orbs */}
      <div className="orb orb-1" style={{ position: "absolute", filter: "blur(140px)", width: "300px", height: "300px", borderRadius: "50%", opacity: 0.25, background: "radial-gradient(circle, #14B8A6, transparent)", top: "10%", right: "15%", pointerEvents: "none" }} />
      <div className="orb orb-2" style={{ position: "absolute", filter: "blur(140px)", width: "400px", height: "400px", borderRadius: "50%", opacity: 0.15, background: "radial-gradient(circle, #0d9488, transparent)", bottom: "5%", left: "10%", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Creative Logo Header */}
        <div style={{ textAlign: "center" }}>
          <Link href="/" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "14px", textDecoration: "none" }}>
            <div
              style={{
                width: "64px", height: "64px",
                background: "linear-gradient(135deg, rgba(30,30,40,0.8), rgba(15,15,20,0.9))",
                borderRadius: "20px",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 15px rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245,158,11,0.25)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) rotate(-3deg)";
                e.currentTarget.style.borderColor = "rgba(245,158,11,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) rotate(0)";
                e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)";
              }}
            >
              <Logo width={42} height={42} />
            </div>
            <div>
              <div style={{ fontSize: "26px", fontWeight: 900, letterSpacing: "-0.5px", background: "linear-gradient(to right, #FFE259, #FFA751)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "0px 2px 10px rgba(255,165,0,0.2)" }}>
                ATUL Residency
              </div>
              <div style={{ fontSize: "11px", color: "rgba(20, 184, 166, 0.6)", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", marginTop: "4px" }}>
                Premium Property Portal
              </div>
            </div>
          </Link>
        </div>

        {/* glassmorphic card */}
        <div 
          style={{ 
            padding: "36px",
            background: "rgba(10, 12, 12, 0.75)",
            border: "1px solid rgba(20, 184, 166, 0.2)",
            borderRadius: "24px",
            backdropFilter: "blur(24px)",
            boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.85), 0 0 30px rgba(20, 184, 166, 0.05)"
          }}
        >
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px", color: "#f8fafc" }}>
              Sign In
            </h2>
            <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.45)", lineHeight: "1.4" }}>
              Log in to your account. The portal will automatically route you to your Admin dashboard or Renter portal.
            </p>
          </div>

          {/* === PASSWORD LOGIN === */}
          {loginMode === "password" && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(226,232,240,0.6)", marginBottom: "6px" }}>
                  Registered Email or Phone Number
                </label>
                <input
                  type="text"
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "12px",
                    background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#f1f5f9", fontSize: "14px", outline: "none", transition: "all 0.3s ease"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(20, 184, 166, 0.5)";
                    e.target.style.boxShadow = "0 0 10px rgba(20, 184, 166, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.08)";
                    e.target.style.boxShadow = "none";
                  }}
                  placeholder="e.g. atultiwari@gmail.com or 7388389944"
                  value={loginData.identifier}
                  onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                  required
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(226,232,240,0.6)" }}>Password</label>
                  <Link href="/forgot-password" style={{ fontSize: "12px", color: "#f59e0b", textDecoration: "none", fontWeight: 600, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fbbf24"} onMouseLeave={(e) => e.currentTarget.style.color = "#f59e0b"}>
                    Forgot Password?
                  </Link>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    style={{
                      width: "100%", padding: "12px 44px 12px 16px", borderRadius: "12px",
                      background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)",
                      color: "#f1f5f9", fontSize: "14px", outline: "none", transition: "all 0.3s ease"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(20, 184, 166, 0.5)";
                      e.target.style.boxShadow = "0 0 10px rgba(20, 184, 166, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: "14px", top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent", border: "none", cursor: "pointer",
                      color: "rgba(226,232,240,0.4)",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "14px", marginTop: "8px",
                  background: "linear-gradient(135deg, #20B2AA 0%, #14B8A6 100%)", border: "none",
                  borderRadius: "12px", color: "#050606", fontSize: "14px", fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  boxShadow: "0 8px 24px rgba(20, 184, 166, 0.25)", transition: "transform 0.2s"
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Key size={16} />}
                {loading ? "Signing in..." : "Secure Sign In"}
              </button>
            </form>
          )}

          {/* === OTP LOGIN === */}
          {loginMode === "otp" && (
            <div>
              {otpStep === "phone" && (
                <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(226,232,240,0.6)", marginBottom: "6px" }}>Registered Email or Phone Number</label>
                    <input
                      type="text"
                      style={{
                        width: "100%", padding: "12px 16px", borderRadius: "12px",
                        background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)",
                        color: "#f1f5f9", fontSize: "14px", outline: "none", transition: "all 0.3s ease"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "rgba(20, 184, 166, 0.5)";
                        e.target.style.boxShadow = "0 0 10px rgba(20, 184, 166, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "rgba(255,255,255,0.08)";
                        e.target.style.boxShadow = "none";
                      }}
                      placeholder="e.g. atultiwari@gmail.com or 7388389944"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !identifier}
                    style={{
                      width: "100%", padding: "14px", marginTop: "8px",
                      background: "linear-gradient(135deg, #20B2AA 0%, #14B8A6 100%)", border: "none",
                      borderRadius: "12px", color: "#050606", fontSize: "14px", fontWeight: 800,
                      cursor: loading || !identifier ? "not-allowed" : "pointer", opacity: loading || !identifier ? 0.7 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      boxShadow: "0 8px 24px rgba(20, 184, 166, 0.25)"
                    }}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={16} />}
                    {loading ? "Sending OTP..." : "Get OTP Code"}
                  </button>
                </form>
              )}

              {otpStep === "verify" && (
                <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{
                    padding: "12px 16px", background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px",
                    display: "flex", alignItems: "center", gap: "10px",
                  }}>
                    <CheckCircle size={16} color="#10b981" />
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#34d399" }}>OTP Sent Successfully!</p>
                      <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)" }}>Enter the verification code to authenticate</p>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(226,232,240,0.6)", marginBottom: "6px" }}>Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      style={{
                        width: "100%", padding: "12px", borderRadius: "12px",
                        background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)",
                        color: "#f1f5f9", fontSize: "24px", letterSpacing: "0.5em", textAlign: "center", fontWeight: 800,
                        outline: "none", transition: "all 0.3s ease"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "rgba(20, 184, 166, 0.5)";
                        e.target.style.boxShadow = "0 0 10px rgba(20, 184, 166, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "rgba(255,255,255,0.08)";
                        e.target.style.boxShadow = "none";
                      }}
                      placeholder="••••••"
                      value={otp} maxLength={6}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    style={{
                      width: "100%", padding: "14px", marginTop: "8px",
                      background: "linear-gradient(135deg, #20B2AA 0%, #14B8A6 100%)", border: "none",
                      borderRadius: "12px", color: "#050606", fontSize: "14px", fontWeight: 800,
                      cursor: loading || otp.length < 6 ? "not-allowed" : "pointer", opacity: loading || otp.length < 6 ? 0.7 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      boxShadow: "0 8px 24px rgba(20, 184, 166, 0.25)"
                    }}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={16} />}
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </button>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <button type="button" onClick={resetOtp} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.4)", fontSize: "12px" }}>
                      ← Change Identifier
                    </button>
                    {resendTimer > 0 ? (
                      <span style={{ fontSize: "12px", color: "rgba(226,232,240,0.35)" }}>Resend in {resendTimer}s</span>
                    ) : (
                      <button type="button" onClick={handleSendOtp as any} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f59e0b", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <RefreshCw size={12} /> Resend OTP
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Toggle Login Method */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "28px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: "10px", color: "rgba(226,232,240,0.35)", textTransform: "uppercase", letterSpacing: "1px" }}>Or login via</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          </div>

          <button
            type="button"
            onClick={() => { setLoginMode(loginMode === "password" ? "otp" : "password"); resetOtp(); }}
            style={{
              width: "100%", padding: "12px", marginTop: "16px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px", color: "#f1f5f9", fontSize: "13px", fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            }}
          >
            {loginMode === "password" ? <Smartphone size={16} color="#14B8A6" /> : <Mail size={16} color="#14B8A6" />}
            {loginMode === "password" ? "Request OTP Verification" : "Use Password Verification"}
          </button>

        </div>

        {/* Footer info (including requested copyright details) */}
        <div style={{ textAlign: "center", fontSize: "11px", color: "rgba(226, 232, 240, 0.3)", lineHeight: "1.6" }}>
          © 2026 ATUL Residency. All rights reserved.
          <br />
          Built by <a href="mailto:prashantmnaitripathi2003@gmail.com" style={{ color: "#FFE259", textDecoration: "none", fontWeight: 600 }}>Prashant Mani Tripathi</a> for ATUL Residency.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050606" }}>
        <Loader2 size={32} className="animate-spin" color="#14B8A6" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
