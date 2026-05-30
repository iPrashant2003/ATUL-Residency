"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  IndianRupee, Users, DoorOpen, AlertTriangle,
  TrendingUp, Clock, Wrench, CreditCard,
  CheckCircle, XCircle, Building2, ArrowUpRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { formatCurrency, getRentStatusColor } from "@/lib/utils";
import { useSession } from "next-auth/react";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  trend,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  color: string;
  trend?: string;
}) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            {label}
          </p>
          <p style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-display)", color: "#e2e8f0", lineHeight: 1 }}>
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.4)", marginTop: "6px" }}>
              {sub}
            </p>
          )}
          {trend && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
              <ArrowUpRight size={12} color="#10b981" />
              <span style={{ fontSize: "11px", color: "#10b981" }}>{trend}</span>
            </div>
          )}
        </div>
        <div
          style={{
            width: "48px",
            height: "48px",
            background: `${color}15`,
            border: `1px solid ${color}25`,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={22} color={color} />
        </div>
      </div>
    </div>
  );
}

// Premium multi-color palette — vibrant & distinguishable
const PIE_COLORS = ["#14B8A6", "#8B5CF6", "#F43F5E", "#F59E0B", "#06B6D4", "#3B82F6"];
const TOWER_COLORS = ["#14B8A6", "#8B5CF6", "#F43F5E", "#F59E0B", "#06B6D4"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const title = label || payload[0]?.name;
    const isPie = !label;
    return (
      <div style={{
        background: "rgba(13,13,31,0.95)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(20,184,166,0.2)",
        borderRadius: "12px",
        padding: "16px 20px",
        fontSize: "13px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(20,184,166,0.15)",
      }}>
        {title && (
          <p style={{
            color: "rgba(226,232,240,0.6)",
            marginBottom: "8px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1px",
            fontSize: "11px",
            paddingBottom: "4px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
          }}>
            {title}
          </p>
        )}
        {payload.map((p: any, i: number) => {
          const isRooms = isPie || p.name?.toLowerCase().includes("room") || (typeof p.value === 'number' && p.value < 100);
          const formattedVal = isRooms ? `${p.value} rooms` : formatCurrency(p.value);
          const color = p.color || p.payload?.fill || PIE_COLORS[i % PIE_COLORS.length];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}88` }} />
              <p style={{ color: "#e2e8f0", fontWeight: 600 }}>
                {isPie ? "Occupied" : p.name}: <span style={{ color: color }}>{formattedVal}</span>
              </p>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const kpis = stats
    ? [
        {
          icon: IndianRupee,
          label: "Total Expected",
          value: formatCurrency(stats.totalExpected),
          sub: "This month",
          color: "#14B8A6",
          trend: "Monthly cycle",
        },
        {
          icon: CheckCircle,
          label: "Collected",
          value: formatCurrency(stats.totalReceived),
          sub: `${stats.collectionRate}% collection rate`,
          color: "#8B5CF6",
          trend: "+12% vs last month",
        },
        {
          icon: Clock,
          label: "Pending",
          value: formatCurrency(stats.totalPending),
          sub: `${stats.paid} paid, ${stats.overdue} overdue`,
          color: "#F43F5E",
        },
        {
          icon: Users,
          label: "Active Renters",
          value: String(stats.totalTenants),
          sub: `${stats.occupiedRooms}/${stats.totalRooms} rooms occupied`,
          color: "#F59E0B",
          trend: "Across all towers",
        },
        {
          icon: DoorOpen,
          label: "Vacant Rooms",
          value: String(stats.vacantRooms),
          sub: "Available for rent",
          color: "#F43F5E",
        },
        {
          icon: Wrench,
          label: "Maintenance",
          value: String(stats.openMaintenance),
          sub: "Open requests",
          color: "#F97316",
        },
        {
          icon: CreditCard,
          label: "Pending Payments",
          value: String(stats.pendingPayments),
          sub: "Awaiting verification",
          color: "#06B6D4",
        },
        {
          icon: TrendingUp,
          label: "Towers",
          value: String(stats.towerStats?.length || 0),
          sub: "Active properties",
          color: "#8B5CF6",
        },
      ]
    : [];

  return (
    <AppLayout
      role="ADMIN"
      title="Dashboard"
      subtitle={`Welcome back, ${session?.user?.name?.split(" ")[0] || "Admin"} 👋`}
      userName={session?.user?.name || ""}
    >
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="shimmer" style={{ height: "120px", borderRadius: "16px" }} />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {kpis.map((kpi, i) => (
              <div key={i} style={{ animationDelay: `${i * 0.05}s` }} className="animate-fade-in-up">
                <StatCard {...kpi} />
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6"
          >
            {/* Revenue trend */}
            <div className="chart-container lg:col-span-2">
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--font-display)" }}>
                Revenue Trend (Last 6 Months)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats?.trend || []}>
                  <defs>
                    <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(226,232,240,0.4)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "rgba(226,232,240,0.4)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: "8px" }} />
                  <Area type="monotone" dataKey="expected" name="Expected" stroke="#14B8A6" fill="url(#gradExpected)" strokeWidth={2} strokeDasharray="6 3" animationDuration={1500} />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#8B5CF6" fill="url(#gradCollected)" strokeWidth={3} animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Tower occupancy */}
            <div className="chart-container">
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--font-display)" }}>
                Tower Occupancy
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={stats?.towerStats?.map((t: any) => ({ name: t.name, value: t.occupiedRooms })) || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    stroke="none"
                    label={false}
                    dataKey="value"
                    animationDuration={1500}
                  >
                    {(stats?.towerStats || []).map((_: any, index: number) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} style={{ filter: `drop-shadow(0px 3px 10px ${PIE_COLORS[index % PIE_COLORS.length]}50)` }} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {(stats?.towerStats || []).map((t: any, i: number) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.7)" }}>{t.name}</span>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>
                      {t.occupiedRooms}/{t.totalRooms}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row: Tower cards + Recent pending */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tower performance */}
            <div className="chart-container">
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", fontFamily: "var(--font-display)" }}>
                Tower Performance
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {(stats?.towerStats || []).map((tower: any, i: number) => {
                  const pct = tower.totalRent > 0 ? Math.round((tower.collected / tower.totalRent) * 100) : 0;
                  return (
                    <div key={tower.id} style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Building2 size={16} color={TOWER_COLORS[i % TOWER_COLORS.length]} />
                          <span style={{ fontWeight: 600, fontSize: "14px" }}>{tower.name}</span>
                        </div>
                        <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)" }}>
                          {tower.occupiedRooms}/{tower.totalRooms} rooms
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                        <span style={{ color: "rgba(226,232,240,0.5)" }}>Collection: {formatCurrency(tower.collected)}</span>
                        <span style={{ color: TOWER_COLORS[i % TOWER_COLORS.length], fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: TOWER_COLORS[i % TOWER_COLORS.length], boxShadow: `0 0 12px ${TOWER_COLORS[i % TOWER_COLORS.length]}88` }} />
                      </div>
                    </div>
                  );
                })}
                {(!stats?.towerStats || stats.towerStats.length === 0) && (
                  <div style={{ textAlign: "center", color: "rgba(226,232,240,0.3)", padding: "20px" }}>
                    No towers configured yet
                  </div>
                )}
              </div>
            </div>

            {/* Pending rents */}
            <div className="chart-container">
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", fontFamily: "var(--font-display)" }}>
                Overdue / Pending
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(stats?.recentPending || []).slice(0, 5).map((r: any) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          background: "var(--gradient-primary)",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "white",
                          overflow: "hidden",
                        }}
                      >
                        {r.tenant?.photoUrl ? (
                          <img src={r.tenant.photoUrl} alt={r.tenant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          r.tenant?.name?.charAt(0) || "?"
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600 }}>{r.tenant?.name || "Unknown"}</p>
                        <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)" }}>
                          Room {r.tenant?.room?.number} · {r.tenant?.room?.tower?.name}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#f59e0b" }}>
                        {formatCurrency(r.totalAmount - r.amountPaid)}
                      </p>
                      <span className={`badge ${getRentStatusColor(r.status)}`} style={{ fontSize: "10px" }}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
                {(!stats?.recentPending || stats.recentPending.length === 0) && (
                  <div style={{ textAlign: "center", color: "rgba(226,232,240,0.3)", padding: "20px" }}>
                    <CheckCircle size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                    <p>All rents are up to date! 🎉</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
