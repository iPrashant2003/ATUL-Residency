"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  IndianRupee, TrendingUp, Users, Clock,
  ArrowUpRight, Building2, ShieldAlert, Award
} from "lucide-react";
import {
  ComposedChart, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell, Line,
  PieChart, Pie,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

// Vibrant Multi-Color Palette
const COLORS = {
  teal: '#14B8A6',
  cyan: '#06B6D4',
  violet: '#8B5CF6',
  amber: '#F59E0B',
  rose: '#F43F5E',
  emerald: '#10B981',
  blue: '#3B82F6',
  orange: '#F97316',
};
const PIE_COLORS = ['#14B8A6', '#8B5CF6', '#F43F5E', '#F59E0B', '#06B6D4', '#3B82F6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
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
        <p style={{
          color: "rgba(226,232,240,0.6)",
          marginBottom: "8px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "1px",
          fontSize: "11px",
          paddingBottom: "6px",
          borderImage: "linear-gradient(90deg, #14B8A6, #8B5CF6, #F43F5E) 1",
          borderBottom: "2px solid",
        }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}88` }} />
            <p style={{ color: "#e2e8f0", fontWeight: 600 }}>
              {p.name}: <span style={{ color: p.color }}>{formatCurrency(p.value)}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = data
    ? [
        { label: "Gross Target", value: formatCurrency(data.totalExpected), icon: IndianRupee, color: "#14B8A6" },
        { label: "Total Collected", value: formatCurrency(data.totalReceived), icon: Award, color: "#8B5CF6" },
        { label: "Pending Collection", value: formatCurrency(data.totalPending), icon: Clock, color: "#F43F5E" },
        { label: "Collection Ratio", value: `${data.collectionRate}%`, icon: TrendingUp, color: "#F59E0B" },
      ]
    : [];

  return (
    <AppLayout role="ADMIN" title="Analytics" subtitle="Deep financial & building occupancy analytics">
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="shimmer" style={{ height: "120px", borderRadius: "16px" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* KPI Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            {stats.map((s, i) => (
              <div key={i} className="stat-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</p>
                  <p style={{ fontSize: "24px", fontWeight: 800, color: s.color, marginTop: "6px", fontFamily: "var(--font-display)" }}>{s.value}</p>
                </div>
                <div style={{ width: "48px", height: "48px", background: `${s.color}15`, border: `1px solid ${s.color}25`, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={22} color={s.color} />
                </div>
              </div>
            ))}
          </div>

          {/* Core Analytics charts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            
            {/* Chart 1: Revenue vs expected ComposedChart */}
            <div className="chart-container lg:col-span-3">
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--font-display)" }}>
                Rent Billing vs Collection (12 Months)
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={data?.trend || []}>
                  <defs>
                    <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.08}/>
                    </linearGradient>
                    <linearGradient id="colorCollectedLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(226,232,240,0.4)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "rgba(226,232,240,0.4)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: "10px" }} />
                  <Bar dataKey="expected" name="Billed Amount" fill="url(#colorExpected)" stroke="#14B8A6" strokeWidth={1} radius={[4, 4, 0, 0]} animationDuration={1500} />
                  <Area type="monotone" dataKey="collected" name="Collected" fill="url(#colorCollectedLine)" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, fill: "#8B5CF6", strokeWidth: 2, stroke: "#131320" }} activeDot={{ r: 6, strokeWidth: 0, fill: "#8B5CF6" }} animationDuration={1500} />
                  <Line type="monotone" dataKey="outstanding" name="Outstanding" stroke="#F43F5E" strokeWidth={2} strokeDasharray="8 4" dot={false} animationDuration={1500} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Tower Comparison */}
            <div className="chart-container lg:col-span-2">
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--font-display)" }}>
                Tower Revenue Distribution
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data?.towerStats?.map((t: any) => ({ name: t.name, value: t.totalRent })) || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                    dataKey="value"
                    animationDuration={1500}
                    stroke="none"
                  >
                    {(data?.towerStats || []).map((_: any, index: number) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} style={{ filter: `drop-shadow(0px 4px 12px ${PIE_COLORS[index % PIE_COLORS.length]}55)` }} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Occupancy and properties split */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            
            {/* Tower Performance details */}
            <div className="chart-container lg:col-span-3">
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "20px", fontFamily: "var(--font-display)" }}>
                Tower Operations Detail
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {(data?.towerStats || []).map((tower: any, i: number) => {
                  const rate = tower.totalRooms > 0 ? Math.round((tower.occupiedRooms / tower.totalRooms) * 100) : 0;
                  const towerColor = PIE_COLORS[i % PIE_COLORS.length];
                  return (
                    <div key={tower.id} style={{ padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Building2 size={16} color={towerColor} />
                          <span style={{ fontWeight: 700, fontSize: "14px" }}>{tower.name}</span>
                        </div>
                        <span style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)" }}>Occupancy: {rate}%</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "12px", color: "rgba(226,232,240,0.6)", marginBottom: "10px" }}>
                        <div>Rooms: <strong>{tower.occupiedRooms}/{tower.totalRooms}</strong></div>
                        <div>Collected: <strong style={{ color: towerColor }}>{formatCurrency(tower.collected)}</strong></div>
                        <div>Target: <strong>{formatCurrency(tower.totalRent)}</strong></div>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${rate}%`, background: towerColor, boxShadow: `0 0 10px ${towerColor}aa` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Occupancy stats ring */}
            <div className="chart-container lg:col-span-2" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <ShieldAlert size={36} color="#14B8A6" style={{ marginBottom: "14px", filter: "drop-shadow(0 0 10px rgba(20,184,166,0.5))" }} />
              <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}>Residency Health Status</h3>
              <p style={{ fontSize: "12px", color: "rgba(226,232,240,0.45)", maxWidth: "220px", marginBottom: "16px" }}>
                Total occupancy of all configured units in Atul Residency.
              </p>
              <div style={{ fontSize: "36px", fontWeight: 900, color: "#14B8A6", fontFamily: "var(--font-display)", textShadow: "0 0 20px rgba(20,184,166,0.4)" }}>
                {data ? (data.totalRooms > 0 ? Math.round((data.occupiedRooms / data.totalRooms) * 100) : 0) : 0}%
              </div>
              <span style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)", marginTop: "4px" }}>
                {data?.occupiedRooms} of {data?.totalRooms} units filled
              </span>
            </div>

          </div>
        </div>
      )}
    </AppLayout>
  );
}
