"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Building2, Plus, Edit, Trash2, Users, DoorOpen, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Tower {
  id: string;
  name: string;
  description: string;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
}

function TowerModal({
  tower,
  onClose,
  onSave,
}: {
  tower?: Tower | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: tower?.name || "",
    description: tower?.description || "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = tower ? `/api/towers/${tower.id}` : "/api/towers";
      const method = tower ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to save tower");
      } else {
        toast.success(tower ? "Tower updated!" : "Tower created!");
        onSave();
        onClose();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            {tower ? "Edit Tower" : "Add New Tower"}
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(226,232,240,0.5)" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label className="form-label">Tower Name *</label>
              <input className="form-input" placeholder="e.g. Tower A" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              placeholder="Optional description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {tower ? "Update Tower" : "Create Tower"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TowersPage() {
  const [towers, setTowers] = useState<Tower[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; tower?: Tower | null }>({ open: false });

  const fetchTowers = async () => {
    try {
      const res = await fetch("/api/towers");
      const data = await res.json();
      setTowers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load towers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTowers(); }, []);

  async function deleteTower(id: string, name: string) {
    const password = prompt(`Are you sure you want to delete ${name}? All rooms and renters will be removed.\n\nPlease enter your admin password to confirm:`);
    if (password === null) return;
    if (!password.trim()) {
      toast.error("Password is required to delete a tower");
      return;
    }
    try {
      const res = await fetch(`/api/towers/${id}`, { 
        method: "DELETE",
        headers: { "x-admin-password": password }
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to delete tower");
      } else {
        toast.success("Tower deleted");
        fetchTowers();
      }
    } catch {
      toast.error("Failed to delete tower");
    }
  }

  const towerColors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

  return (
    <AppLayout role="ADMIN" title="Tower Management" subtitle="Manage your residential towers">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">All Towers</h2>
          <p className="section-subtitle">{towers.length} tower{towers.length !== 1 ? "s" : ""} configured</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true, tower: null })}>
          <Plus size={18} />
          Add Tower
        </button>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {[1, 2].map((i) => <div key={i} className="shimmer" style={{ height: "220px", borderRadius: "20px" }} />)}
        </div>
      ) : towers.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            background: "var(--glass-bg)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "20px",
          }}
        >
          <Building2 size={48} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>No towers yet</h3>
          <p style={{ color: "rgba(226,232,240,0.4)", marginBottom: "24px" }}>Add your first tower to get started</p>
          <button className="btn-primary" onClick={() => setModal({ open: true, tower: null })}>
            <Plus size={18} />
            Add Tower A
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {towers.map((tower, i) => {
            const color = towerColors[i % towerColors.length];
            const occPct = tower.totalRooms > 0 ? Math.round((tower.occupiedRooms / tower.totalRooms) * 100) : 0;
            return (
              <div
                key={tower.id}
                className="glass-card"
                style={{ padding: "24px" }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "52px",
                        height: "52px",
                        background: `${color}18`,
                        border: `1px solid ${color}35`,
                        borderRadius: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Building2 size={24} color={color} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-display)" }}>{tower.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                        {tower.totalRooms} room{tower.totalRooms !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => setModal({ open: true, tower })}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "rgba(226,232,240,0.6)" }}
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => deleteTower(tower.id, tower.name)}
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "rgba(239,68,68,0.7)" }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {tower.description && (
                  <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.45)", marginBottom: "16px", lineHeight: 1.5 }}>
                    {tower.description}
                  </p>
                )}

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                  {[
                    { label: "Total", value: tower.totalRooms, icon: DoorOpen, color: color },
                    { label: "Occupied", value: tower.occupiedRooms, icon: Users, color: "#10b981" },
                    { label: "Vacant", value: tower.vacantRooms, icon: DoorOpen, color: "#f59e0b" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        textAlign: "center",
                        padding: "10px 8px",
                        background: `${stat.color}08`,
                        border: `1px solid ${stat.color}18`,
                        borderRadius: "10px",
                      }}
                    >
                      <p style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-display)", color: stat.color }}>{stat.value}</p>
                      <p style={{ fontSize: "10px", color: "rgba(226,232,240,0.4)", marginTop: "2px" }}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Occupancy bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "rgba(226,232,240,0.5)" }}>Occupancy</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color }}>{occPct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${occPct}%`, background: color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <TowerModal
          tower={modal.tower}
          onClose={() => setModal({ open: false })}
          onSave={fetchTowers}
        />
      )}
    </AppLayout>
  );
}
