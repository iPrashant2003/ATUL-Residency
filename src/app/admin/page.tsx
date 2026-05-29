"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function AdminRoot() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin/dashboard");
    } else if (status === "unauthenticated") {
      router.replace("/login?role=admin");
    }
  }, [status, router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg-primary)" }}>
      <Loader2 size={40} className="animate-spin" color="#8b5cf6" />
    </div>
  );
}
