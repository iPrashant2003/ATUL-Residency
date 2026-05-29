"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, Lock, ArrowRight, Building, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Logo from "@/components/Logo";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return toast.error("Please enter your email or phone number");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "OTP sent successfully");
        if (data.devOtp) {
          toast.info(`Simulation Mode: Your reset OTP is ${data.devOtp}`, { duration: 15000 });
        }
        setStep(2);
      } else {
        toast.error(data.error || "Failed to send OTP");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) return toast.error("Please fill in all fields");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, otp, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setStep(3); // Success step
        setTimeout(() => router.push("/login"), 3000);
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.04) 0%, #050606 100%), linear-gradient(to right, rgba(20, 184, 166, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(20, 184, 166, 0.02) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 45px 45px, 45px 45px",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Outfit', sans-serif"
      }}
    >
      {/* Background orbs */}
      <div className="orb orb-1" style={{ position: "absolute", filter: "blur(140px)", width: "300px", height: "300px", borderRadius: "50%", opacity: 0.2, background: "radial-gradient(circle, #14B8A6, transparent)", top: "10%", right: "15%", pointerEvents: "none" }} />
      <div className="orb orb-2" style={{ position: "absolute", filter: "blur(140px)", width: "300px", height: "300px", borderRadius: "50%", opacity: 0.15, background: "radial-gradient(circle, #0d9488, transparent)", bottom: "5%", left: "10%", pointerEvents: "none" }} />
      
      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
        <div 
          className="glass-card" 
          style={{ 
            width: "100%", 
            padding: "36px", 
            background: "rgba(10, 12, 12, 0.75)",
            border: "1px solid rgba(20, 184, 166, 0.2)",
            borderRadius: "24px",
            backdropFilter: "blur(24px)",
            boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.85), 0 0 30px rgba(20, 184, 166, 0.05)"
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <Link href="/" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "12px", textDecoration: "none", marginBottom: "16px" }}>
              <div
                style={{
                  width: "56px", height: "56px",
                  background: "linear-gradient(135deg, rgba(30,30,40,0.8), rgba(15,15,20,0.9))",
                  borderRadius: "16px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 10px rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                <Logo width={36} height={36} />
              </div>
              <div style={{ fontSize: "22px", fontWeight: 950, letterSpacing: "-0.5px", background: "linear-gradient(to right, #FFE259, #FFA751)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ATUL Residency
              </div>
            </Link>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f8fafc" }}>
              {step === 1 ? "Forgot Password" : step === 2 ? "Verify OTP" : "Password Reset!"}
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.45)", marginTop: "8px", lineHeight: "1.4" }}>
              {step === 1
                ? "Enter your registered email or phone to receive a reset OTP."
                : step === 2
                ? `We sent a 6-digit code to ${identifier}`
                : "Your password has been successfully reset. Redirecting to login..."}
            </p>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label className="form-label" style={{ color: "rgba(226,232,240,0.6)", fontSize: "12px", fontWeight: 600 }}>Email Address or Phone Number</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} color="rgba(226,232,240,0.4)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "40px", background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.08)", color: "#f1f5f9" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(20, 184, 166, 0.5)";
                      e.target.style.boxShadow = "0 0 10px rgba(20, 184, 166, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="Enter Username"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px", background: "linear-gradient(135deg, #20B2AA 0%, #14B8A6 100%)", color: "#050606", fontWeight: 800, boxShadow: "0 8px 24px rgba(20, 184, 166, 0.25)" }}>
                {loading ? "Sending OTP..." : "Send OTP"} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label className="form-label" style={{ color: "rgba(226,232,240,0.6)", fontSize: "12px", fontWeight: 600 }}>6-Digit OTP</label>
                <div style={{ position: "relative" }}>
                  <KeyRound size={16} color="rgba(226,232,240,0.4)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="form-input"
                    style={{ paddingLeft: "40px", letterSpacing: "4px", fontSize: "18px", fontWeight: 700, background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.08)", color: "#f1f5f9", textAlign: "center" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(20, 184, 166, 0.5)";
                      e.target.style.boxShadow = "0 0 10px rgba(20, 184, 166, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="------"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="form-label" style={{ color: "rgba(226,232,240,0.6)", fontSize: "12px", fontWeight: 600 }}>New Password</label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} color="rgba(226,232,240,0.4)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "40px", background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.08)", color: "#f1f5f9" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(20, 184, 166, 0.5)";
                      e.target.style.boxShadow = "0 0 10px rgba(20, 184, 166, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "none";
                    }}
                    placeholder="Enter new password (min 6 chars)"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px", background: "linear-gradient(135deg, #20B2AA 0%, #14B8A6 100%)", color: "#050606", fontWeight: 800, boxShadow: "0 8px 24px rgba(20, 184, 166, 0.25)" }}>
                {loading ? "Resetting..." : "Reset Password"} <ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => setStep(1)} className="btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: "13px", padding: "10px", color: "rgba(226,232,240,0.5)", background: "transparent", border: "none", cursor: "pointer" }}>
                Change Email / Phone
              </button>
            </form>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <Link href="/login" className="btn-primary" style={{ padding: "12px 24px", background: "linear-gradient(135deg, #20B2AA 0%, #14B8A6 100%)", color: "#050606", fontWeight: 800, textDecoration: "none", borderRadius: "12px", display: "inline-block", boxShadow: "0 8px 24px rgba(20, 184, 166, 0.25)" }}>
                Return to Login
              </Link>
            </div>
          )}

          {step === 1 && (
            <div style={{ marginTop: "32px", textAlign: "center", fontSize: "13px", color: "rgba(226,232,240,0.5)" }}>
              Remember your password?{" "}
              <Link href="/login" style={{ color: "#14B8A6", textDecoration: "none", fontWeight: 700 }}>
                Login here
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: "11px", color: "rgba(226, 232, 240, 0.3)", lineHeight: "1.6" }}>
          © 2026 ATUL Residency. All rights reserved.
          <br />
          Built by <a href="mailto:prashantmnaitripathi2003@gmail.com" style={{ color: "#FFE259", textDecoration: "none", fontWeight: 600 }}>Prashant Mani Tripathi</a> for ATUL Residency.
        </div>
      </div>
    </div>
  );
}




