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

export const COSTO_DOMICILIO = 3000;

export const estadoLabel: Record<string, string> = {
  pendiente: "Pendiente",
  pendientes: "Pendiente",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function Spinner() {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: "22px", height: "22px",
        border: "3px solid #e2e8f0",
        borderTop: `3px solid ${COLORS.azul}`,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        margin: "40px auto",
      }} />
    </>
  );
}