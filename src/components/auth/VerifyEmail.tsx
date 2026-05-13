import { useTheme } from "../../App";

export default function VerifyEmail({ status, msg, email, onVolver }: { status: "loading" | "success" | "error"; msg?: string; email: string; onVolver: () => void }) {
  const { modoOscuro } = useTheme();
  const bgMain = modoOscuro ? "min-h-screen bg-slate-900 text-white" : "min-h-screen bg-violet-50 text-slate-800";

  return (
    <div className={`${bgMain} flex items-center justify-center p-4`}>
      <div className={`${modoOscuro ? "bg-slate-800" : "bg-white"} rounded-2xl p-8 shadow-2xl w-full max-w-sm text-center`}>
        {status === "loading" && (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-lg font-semibold">Verificando...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <p className="text-lg font-semibold mb-2" style={{ color: "#22c55e" }}>¡Correo verificado!</p>
            <p className="text-sm mb-4" style={{ color: modoOscuro ? "#9ca3af" : "#6b7280" }}>{msg}</p>
            <button onClick={onVolver} className="bg-violet-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-violet-700">Iniciar sesión</button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <p className="text-lg font-semibold mb-2" style={{ color: "#ef4444" }}>Error de verificación</p>
            <p className="text-sm mb-4" style={{ color: modoOscuro ? "#9ca3af" : "#6b7280" }}>{msg || "El enlace es inválido o expiró."}</p>
            <button onClick={onVolver} className="bg-violet-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-violet-700">Volver</button>
          </>
        )}
      </div>
    </div>
  );
}
