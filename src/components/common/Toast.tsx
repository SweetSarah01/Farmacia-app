import { useEffect, useState } from "react";
import { COLORS } from "./Spinner";

interface ToastProps {
  msg: string;
  tipo: string;
  onClose: () => void;
}

export function Toast({ msg, tipo, onClose }: ToastProps) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  const bg = tipo === "error" ? COLORS.rojo : tipo === "warn" ? COLORS.amarillo : COLORS.verde;
  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", background: bg, color: "#fff", padding: "12px 20px", borderRadius: "10px", fontWeight: 600, fontSize: "14px", zIndex: 9999 }}>
      {msg}
    </div>
  );
}

interface ToastState {
  msg: string;
  tipo: string;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ msg: "", tipo: "ok" });
  const show = (msg: string, tipo = "ok") => setToast({ msg, tipo });
  const clear = () => setToast({ msg: "", tipo: "ok" });
  return { toast, show, clear };
}