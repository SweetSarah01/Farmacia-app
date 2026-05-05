import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useTheme } from "../../App";
import BlobsAuth from "./BlobsAuth";

export default function AuthPanel({ onVolver }: { onVolver?: () => void }) {
  const navigate = useNavigate();
  const { modoOscuro } = useTheme();
  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", documento: "", direccion: "", telefono: "", ciudad: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarPasswordReg, setMostrarPasswordReg] = useState(false);

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError("Completa todos los campos"); return; }
    setCargando(true);
    setError("");
    try {
      let emailToUse = form.email;
      if (!form.email.includes("@")) {
        const { data: perfil } = await supabase.from("profiles").select("email").eq("nombre_usuario", form.email).single();
        if (perfil) emailToUse = perfil.email;
        else { setCargando(false); setError("Usuario no encontrado"); return; }
      }
      const { error: e } = await supabase.auth.signInWithPassword({ email: emailToUse, password: form.password });
      setCargando(false);
      if (e) { setError("Usuario o contraseña incorrectos"); }
    } catch (err: any) {
      setCargando(false);
      setError("Error: " + err.message);
    }
  };

  const handleRegistro = async () => {
    if (!form.nombre || !form.email || !form.password || !form.documento) {
      setError("Completa todos los campos obligatorios (nombre, email, contraseña y documento)");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            nombre: form.nombre,
            documento: form.documento,
            telefono: form.telefono || '',
            direccion: form.direccion || '',
            ciudad: form.ciudad || ''
          }
        }
      });
      if (authError) {
        setError(authError.message);
        setCargando(false);
        return;
      }
      // El trigger de la base de datos crea el perfil automáticamente
      setCargando(false);
      setModo("login");
      setError("Registro exitoso! Ya puedes iniciar sesión.");
    } catch (err: any) {
      setCargando(false);
      setError("Error: " + err.message);
    }
  };

  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const bgCard = modoOscuro ? "bg-slate-800/80" : "bg-white/80";
  const bgInput = modoOscuro ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-violet-300 text-slate-800";

  return (
    <div className={`${bgCard} rounded-2xl p-8 shadow-2xl relative w-full max-w-sm`}>
      <div className="relative z-10">
        {onVolver && (
          <div className="relative flex items-center justify-center mb-4">
            <button
              onClick={onVolver}
              className="absolute left-0 p-2 w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center hover:bg-violet-500 hover:text-white transition-all text-sm font-bold"
            >
              ←
            </button>
            <p className="text-center text-2xl font-bold w-full" style={{ color: modoOscuro ? '#fff' : '#1f2937' }}>
              {modo === "login" ? "Login" : "Crear Cuenta"}
            </p>
          </div>
        )}

        {modo === "login" ? (
          <form className="mt-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Email o Usuario</label>
              <input
                type="text"
                name="username"
                placeholder=""
                value={form.email}
                onChange={e => upd("email", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Contraseña</label>
              <div className="relative">
                <input
                  type={mostrarPassword ? "text" : "password"}
                  name="password"
                  placeholder=""
                  value={form.password}
                  onChange={e => upd("password", e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                  style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {mostrarPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && <div className="mt-4 p-2 rounded bg-red-900/50 text-red-400 text-sm">{error}</div>}

            <button type="submit" disabled={cargando} className="w-full mt-4 py-3 rounded-md font-semibold disabled:opacity-50 bg-violet-500 text-white hover:bg-violet-600">
              {cargando ? "Cargando..." : "Iniciar Sesión"}
            </button>
          </form>
        ) : (
          <form className="mt-6 w-full max-w-sm mx-auto" onSubmit={(e) => { e.preventDefault(); handleRegistro(); }}>
            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Nombre completo *</label>
              <input
                type="text"
                name="nombre"
                placeholder=""
                value={form.nombre}
                onChange={e => upd("nombre", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Documento de identidad *</label>
              <input
                type="text"
                name="documento"
                placeholder=""
                value={form.documento}
                onChange={e => upd("documento", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Correo electrónico *</label>
              <input
                type="email"
                name="email"
                placeholder=""
                value={form.email}
                onChange={e => upd("email", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Contraseña *</label>
              <div className="relative">
                <input
                  type={mostrarPasswordReg ? "text" : "password"}
                  name="password"
                  placeholder=""
                  value={form.password}
                  onChange={e => upd("password", e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                  style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPasswordReg(!mostrarPasswordReg)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {mostrarPasswordReg ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Teléfono</label>
              <input
                type="text"
                name="telefono"
                placeholder=""
                value={form.telefono}
                onChange={e => upd("telefono", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Ciudad</label>
              <input
                type="text"
                name="ciudad"
                placeholder=""
                value={form.ciudad}
                onChange={e => upd("ciudad", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Dirección</label>
              <input
                type="text"
                name="direccion"
                placeholder=""
                value={form.direccion}
                onChange={e => upd("direccion", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
            </div>

            {error && <div className="mt-4 p-2 rounded bg-red-900/50 text-red-400 text-sm">{error}</div>}

            <button type="submit" disabled={cargando} className="w-full mt-4 py-3 rounded-md font-semibold disabled:opacity-50 bg-violet-500 text-white hover:bg-violet-600">
              {cargando ? "Cargando..." : "Registrarse"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
