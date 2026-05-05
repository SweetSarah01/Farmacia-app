import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const COSTO_DOMICILIO = 3000;

export const COLORS = {
  azul: "#2563eb",
  verde: "#16a34a",
  rojo: "#dc2626",
  amarillo: "#f59e0b",
  morado: "#7c3aed",
  fondo: "#f8fafc",
  blanco: "#ffffff",
  gris: "#64748b",
  oscuro: "#0f172a",
  superfBlanca: "#f1f5f9",
};

export const fmtCOP = (n: number) => 
  n ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n) : "$0";

export const fmtFecha = (f: string | Date) => 
  f ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(f)) : "";

export const estadoLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};