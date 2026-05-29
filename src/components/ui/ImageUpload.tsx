"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Camera, FileImage } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

export default function ImageUpload({ value, onChange, label, placeholder }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (images only)
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, etc.)");
      return;
    }

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size is too large (maximum 10MB)");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error();
      }

      const data = await res.json();
      onChange(data.url);
      toast.success("Image uploaded successfully! 📸");
    } catch {
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {label && <label className="form-label">{label}</label>}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      {value ? (
        // Preview state
        <div style={{
          position: "relative",
          borderRadius: "12px",
          border: "1px solid var(--glass-border)",
          overflow: "hidden",
          background: "rgba(0,0,0,0.3)",
          width: "100%",
          height: "220px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <img
            src={value}
            alt="Uploaded attachment preview"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
          <button
            type="button"
            onClick={removeImage}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(239, 68, 68, 0.8)",
              border: "none",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#ef4444")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.8)")}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        // Trigger state
        <div
          onClick={triggerUpload}
          style={{
            border: "2px dashed var(--glass-border)",
            borderRadius: "12px",
            padding: "32px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: "rgba(255, 255, 255, 0.02)",
            transition: "all 0.2s",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--primary-color, #14B8A6)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--glass-border)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={32} className="animate-spin" color="#14B8A6" />
              <p style={{ fontSize: "13px", color: "rgba(226,232,240,0.5)" }}>Uploading photo from device...</p>
            </>
          ) : (
            <>
              <div style={{
                width: "48px",
                height: "48px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--glass-border)",
              }}>
                <Camera size={20} color="rgba(226,232,240,0.6)" />
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>
                  {placeholder || "Take a photo or choose file"}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(226,232,240,0.4)", marginTop: "4px" }}>
                  Supports JPEG, PNG, HEIC up to 10MB
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
