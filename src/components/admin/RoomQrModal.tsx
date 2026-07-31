"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { X, Copy, Download, QrCode, ExternalLink, Check, Sparkles, Building2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface RoomQrModalProps {
  roomNumber?: string;
  towerName?: string;
  onClose: () => void;
}

export default function RoomQrModal({ roomNumber, towerName, onClose }: RoomQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://atul-residency.vercel.app";
  const publicUrl = roomNumber
    ? `${baseUrl}/request-maintenance?room=${encodeURIComponent(roomNumber)}`
    : `${baseUrl}/request-maintenance`;

  useEffect(() => {
    generateQr();
  }, [publicUrl]);

  async function generateQr() {
    try {
      const url = await QRCode.toDataURL(publicUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error("Failed to generate QR Code:", err);
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Public Form Link copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = roomNumber
      ? `AtulResidency_Room_${roomNumber}_Maintenance_QR.png`
      : `AtulResidency_Maintenance_Form_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("QR Code downloaded!");
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "460px",
          width: "90%",
          padding: "28px",
          borderRadius: "24px",
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(20, 184, 166, 0.4)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
          textAlign: "center",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "12px", background: "rgba(20, 184, 166, 0.2)", color: "#2dd4bf" }}>
              <QrCode size={20} />
            </div>
            <div style={{ textAlign: "left" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
                {roomNumber ? `Room ${roomNumber} Maintenance QR` : "Public Maintenance Form QR"}
              </h3>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                {roomNumber ? `${towerName || "Atul Residency"} • Room QR Code` : "Scan to log repair query"}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {/* Printable Card Frame */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "24px",
            color: "#0f172a",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
            <Building2 size={20} style={{ color: "#0d9488" }} />
            <span style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "1px", color: "#0f172a" }}>
              ATUL RESIDENCY
            </span>
          </div>

          <div style={{ fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "14px" }}>
            {roomNumber ? `ROOM ${roomNumber} MAINTENANCE DESK` : "QUICK REPAIR REQUEST DESK"}
          </div>

          {/* QR Image */}
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Maintenance QR Code" style={{ width: "200px", height: "200px", margin: "0 auto", borderRadius: "12px", border: "2px solid #cbd5e1" }} />
          ) : (
            <div style={{ width: "200px", height: "200px", margin: "0 auto", background: "#f1f5f9", borderRadius: "12px" }} />
          )}

          <div style={{ marginTop: "14px", fontSize: "12px", fontWeight: 700, color: "#0d9488" }}>
            📲 Scan with Phone Camera to Request Repair
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            Work guaranteed in 24 hours max • Auto WhatsApp confirmation
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleDownloadQr}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Download size={16} /> Download QR Image
            </button>

            <button
              onClick={handleCopyLink}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "14px",
                background: "rgba(30, 41, 59, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f8fafc",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {copied ? <Check size={16} style={{ color: "#2dd4bf" }} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "10px",
              borderRadius: "12px",
              background: "rgba(20, 184, 166, 0.1)",
              color: "#2dd4bf",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <ExternalLink size={14} /> Open Public Form in Browser
          </a>
        </div>
      </div>
    </div>
  );
}
