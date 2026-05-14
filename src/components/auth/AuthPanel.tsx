import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useTheme } from "../../App";

export default function AuthPanel({ onVolver }: { onVolver?: () => void }) {
  const { modoOscuro } = useTheme();
  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", documento: "", direccion: "", telefono: "", ciudad: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarPasswordReg, setMostrarPasswordReg] = useState(false);
  const [verificando, setVerificando] = useState(false);

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
      else { window.location.reload(); }
    } catch (err: any) {
      setCargando(false);
      setError("Error: " + err.message);
    }
  };

  const handleRegistro = async () => {
    const f = { ...form };
    console.log('handleRegistro form:', f);
    if (!f.nombre || !f.email || !f.password || !f.documento) {
      setError("Completa todos los campos obligatorios (nombre, email, contraseña y documento)");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const res = await fetch('/api/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: f.email, name: f.nombre, password: f.password, documento: f.documento, telefono: f.telefono, direccion: f.direccion, ciudad: f.ciudad })
      });
      const result = await res.json();
      setCargando(false);
      if (result.error) {
        setError(result.error);
      } else {
        setVerificando(true);
      }
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

        {verificando ? (
          <div className="mt-6 w-full max-w-sm mx-auto text-center">
            <div className="text-5xl mb-4">📧</div>
            <p className="text-center text-lg font-semibold mb-2" style={{ color: modoOscuro ? '#fff' : '#1f2937' }}>
              Revisa tu correo
            </p>
            <p className="text-center text-sm mb-4" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>
              Enviamos un enlace de verificación a <br/>
              <strong style={{ color: '#a78bfa' }}>{form.email}</strong>
            </p>
            <p className="text-center text-xs mb-4" style={{ color: modoOscuro ? '#6b7280' : '#9ca3af' }}>
              Haz clic en el enlace del correo para activar tu cuenta.<br/>
              El enlace expira en 15 minutos.
            </p>
            {error && <div className="mt-4 p-2 rounded bg-red-900/50 text-red-400 text-sm">{error}</div>}
          </div>
        ) : modo === "login" ? (
          <form className="mt-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Email o Usuario</label>
              <input
                type="text"
                id="email"
                name="email"
                placeholder=""
                value={form.email}
                onChange={e => upd("email", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Contraseña</label>
              <input
                type={mostrarPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder=""
                value={form.password}
                onChange={e => upd("password", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
              <div 
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="mt-1 text-xs cursor-pointer hover:underline"
                style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}
              >
                {mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              </div>
            </div>

            {error && <div className="mt-4 p-2 rounded bg-red-900/50 text-red-400 text-sm">{error}</div>}

            <button type="submit" disabled={cargando} className="w-full mt-4 py-3 rounded-md font-semibold disabled:opacity-50 bg-violet-500 text-white hover:bg-violet-600">
              {cargando ? "Cargando..." : "Iniciar Sesión"}
            </button>
          </form>
        ) : (
          <div className="mt-6 w-full max-w-sm mx-auto">
            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Nombre completo *</label>
              <input
                type="text"
                id="nombre"
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
                id="documento"
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
                id="email-reg"
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
              <input
                type={mostrarPasswordReg ? "text" : "password"}
                id="password-reg"
                name="password"
                placeholder=""
                value={form.password}
                onChange={e => upd("password", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
              <div 
                onClick={() => setMostrarPasswordReg(!mostrarPasswordReg)}
                className="mt-1 text-xs cursor-pointer hover:underline"
                style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}
              >
                {mostrarPasswordReg ? "Ocultar contraseña" : "Mostrar contraseña"}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>Teléfono</label>
              <input
                type="text"
                id="telefono-reg"
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
                id="ciudad-reg"
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
                id="direccion-reg"
                name="direccion"
                placeholder=""
                value={form.direccion}
                onChange={e => upd("direccion", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
                style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              />
            </div>

            {error && <div className="mt-4 p-2 rounded bg-red-900/50 text-red-400 text-sm">{error}</div>}

            <button type="button" disabled={cargando} onClick={handleRegistro} className="w-full mt-4 py-3 rounded-md font-semibold disabled:opacity-50 bg-violet-500 text-white hover:bg-violet-600">
              {cargando ? "Cargando..." : "Registrarse"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
