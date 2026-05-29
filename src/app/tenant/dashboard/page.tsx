"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useSession } from "next-auth/react";
import {
  IndianRupee, Clock, CheckCircle, Wrench, Bell,
  AlertTriangle, MessageCircle, FileText, CalendarDays, Phone,
} from "lucide-react";
import { formatCurrency, getRentStatusColor, getMonthName } from "@/lib/utils";
import Link from "next/link";

export default function TenantDashboard() {
  const { data: session } = useSession();
  const [rentRecords, setRentRecords] = useState<any[]>([]);
  const [maintenanceReqs, setMaintenanceReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [dbTenantId, setDbTenantId] = useState<string | null>(null);

  const userId = (session?.user as any)?.id;
  const sessionTenantId = (session?.user as any)?.tenantId;

  useEffect(() => {
    const fetchTenantData = async (tId: string) => {
      try {
        const [rents, maintenance, tenants] = await Promise.all([
          fetch(`/api/rent?tenantId=${tId}`).then((r) => r.json()),
          fetch(`/api/maintenance?tenantId=${tId}`).then((r) => r.json()),
          fetch(`/api/tenants?userId=${userId}`).then((r) => r.json()),
        ]);
        setRentRecords(Array.isArray(rents) ? rents : []);
        setMaintenanceReqs(Array.isArray(maintenance) ? maintenance : []);
        if (Array.isArray(tenants) && tenants.length > 0) setTenantInfo(tenants[0]);
      } catch (err) {
        console.error("Error loading tenant dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionTenantId) {
      setDbTenantId(sessionTenantId);
      fetchTenantData(sessionTenantId);
    } else if (userId) {
      // Stale session check
      fetch("/api/tenant/profile")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          if (data?.tenant?.id) {
            setDbTenantId(data.tenant.id);
            fetchTenantData(data.tenant.id);
          } else {
            setLoading(false);
          }
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [userId, sessionTenantId]);

  if (!loading && !dbTenantId) {
    return (
      <AppLayout
        role="TENANT"
        title="My Dashboard"
        subtitle={`Welcome, ${session?.user?.name?.split(" ")[0] || ""}! 👋`}
        userName={session?.user?.name || ""}
      >
        <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 16px" }}>
          <div className="glass-card" style={{
            padding: "36px",
            border: "1px solid rgba(245,158,11,0.25)",
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)",
            textAlign: "center",
          }}>
            <div style={{
              width: "64px", height: "64px",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              <AlertTriangle size={32} color="#f59e0b" />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-display)", color: "#e2e8f0", marginBottom: "12px" }}>
              Room Assignment Pending
            </h2>
            <p style={{ color: "rgba(226,232,240,0.55)", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
              Your account has been successfully registered, but you have not been assigned to a room yet. Please contact the administrator (Atul Tiwari) to assign your room. Once assigned, your rent invoices, payment options, and maintenance services will appear here.
            </p>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "10px", padding: "12px", fontSize: "14px", color: "rgba(226,232,240,0.7)"
            }}>
              <Phone size={16} color="#14B8A6" />
              <span>Contact Landlord: <strong>+91 6392651108</strong> (Atul Tiwari)</span>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const now = new Date();
  const currentMonthRecord = rentRecords.find(
    (r) => r.month === now.getMonth() + 1 && r.year === now.getFullYear()
  );

  const totalPaid = rentRecords.filter((r) => r.status === "PAID").length;
  const totalPending = rentRecords.filter((r) => r.status === "PENDING" || r.status === "OVERDUE").length;
  const openMaintenance = maintenanceReqs.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length;

  return (
    <AppLayout
      role="TENANT"
      title="My Dashboard"
      subtitle={`Welcome back, ${session?.user?.name?.split(" ")[0] || ""}! 👋`}
      userName={session?.user?.name || ""}
    >
      {/* Current month card */}
      {loading ? (
        <div className="shimmer" style={{ height: "160px", borderRadius: "20px", marginBottom: "24px" }} />
      ) : currentMonthRecord ? (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(59,130,246,0.15) 100%)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: "20px",
            padding: "28px",
            marginBottom: "24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", background: "rgba(139,92,246,0.1)", borderRadius: "50%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                {getMonthName(currentMonthRecord.month)} {currentMonthRecord.year} — Current Invoice
              </p>
              <div style={{ fontSize: "42px", fontWeight: 900, fontFamily: "var(--font-display)", color: "#e2e8f0", lineHeight: 1 }}>
                {formatCurrency(currentMonthRecord.totalAmount)}
              </div>
              <div style={{ display: "flex", gap: "20px", marginTop: "12px", fontSize: "13px", color: "rgba(226,232,240,0.6)" }}>
                <span>🏠 Rent: {formatCurrency(currentMonthRecord.rentAmount)}</span>
                <span>⚡ Electricity: {formatCurrency(currentMonthRecord.electricityBill)}</span>
                {currentMonthRecord.meterReading && (
                  <span>📟 Meter: {currentMonthRecord.meterReading}</span>
                )}
                {currentMonthRecord.meterPhotoUrl && (
                  <a href={currentMonthRecord.meterPhotoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#a78bfa", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    📸 View Photo
                  </a>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className={`badge ${getRentStatusColor(currentMonthRecord.status)}`} style={{ fontSize: "13px", padding: "8px 16px" }}>
                {currentMonthRecord.status}
              </span>
              {currentMonthRecord.amountPaid > 0 && currentMonthRecord.status !== "PAID" && (
                <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)", marginTop: "8px" }}>
                  Paid: {formatCurrency(currentMonthRecord.amountPaid)} · Balance: {formatCurrency(currentMonthRecord.totalAmount - currentMonthRecord.amountPaid)}
                </p>
              )}
              {currentMonthRecord.status !== "PAID" && (
                currentMonthRecord.payments?.some((p: any) => p.status === "PENDING") ? (
                  <div style={{ marginTop: "12px", fontSize: "12px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", padding: "6px 12px", borderRadius: "8px", display: "inline-block", border: "1px solid rgba(245,158,11,0.3)" }}>
                    <Clock size={12} style={{ display: "inline", marginRight: "4px", verticalAlign: "-2px" }} />
                    Payment Under Verification
                  </div>
                ) : (
                  <Link
                    href="/tenant/payments"
                    className="btn-primary"
                    style={{ display: "inline-flex", marginTop: "12px", padding: "8px 20px", fontSize: "13px", textDecoration: "none" }}
                  >
                    Pay Now
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: "24px", marginBottom: "24px", textAlign: "center" }}>
          <CalendarDays size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ color: "rgba(226,232,240,0.5)" }}>No rent record for this month yet</p>
        </div>
      )}

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Months Paid", value: totalPaid, color: "#10b981", icon: CheckCircle },
          { label: "Pending", value: totalPending, color: "#f59e0b", icon: Clock },
          { label: "Maintenance", value: openMaintenance, color: "#ef4444", icon: Wrench },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <s.icon size={14} color={s.color} />
              <span style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", textTransform: "uppercase" }}>{s.label}</span>
            </div>
            <p style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Pay Rent", sub: "Upload payment screenshot", icon: IndianRupee, href: "/tenant/payments", color: "#8b5cf6" },
          { label: "Request Service", sub: "Plumbing, Electrician, etc.", icon: Wrench, href: "/tenant/maintenance", color: "#3b82f6" },
          { label: "UPI Payment", sub: "atultiwari123321@oksbi", icon: MessageCircle, href: "/tenant/payments#upi", color: "#10b981" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            style={{ textDecoration: "none" }}
          >
            <div className="glass-card" style={{ padding: "20px", cursor: "pointer" }}>
              <div style={{ width: "44px", height: "44px", background: `${action.color}15`, border: `1px solid ${action.color}30`, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <action.icon size={22} color={action.color} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>{action.label}</h3>
              <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.45)" }}>{action.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Rent history */}
      <div className="glass-card" style={{ padding: "20px", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "16px" }}>
          Payment History
        </h3>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: "52px", borderRadius: "8px" }} />)}
          </div>
        ) : rentRecords.length === 0 ? (
          <p style={{ color: "rgba(226,232,240,0.4)", textAlign: "center", padding: "20px 0", fontSize: "13px" }}>No payment history yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {rentRecords.slice(0, 6).map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600 }}>{getMonthName(r.month)} {r.year}</p>
                  <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)" }}>Rent: {formatCurrency(r.rentAmount)} + Elec: {formatCurrency(r.electricityBill)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "14px", fontWeight: 700 }}>{formatCurrency(r.totalAmount)}</p>
                  <span className={`badge ${getRentStatusColor(r.status)}`} style={{ fontSize: "10px" }}>{r.status}</span>
                  {r.payments?.some((p: any) => p.status === "PENDING") && r.status !== "PAID" && (
                    <div style={{ fontSize: "10px", color: "#f59e0b", marginTop: "4px", fontWeight: 600 }}>Verifying...</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
