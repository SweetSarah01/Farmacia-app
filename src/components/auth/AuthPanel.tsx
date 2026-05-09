import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useTheme } from "../../App";
import BlobsAuth from "./BlobsAuth";

const API_URL = import.meta.env.VITE_API_URL || '';

const sendVerificationCode = async (email: string) => {
  const res = await fetch(`${API_URL}/api/send-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.json();
};

const verifyCode = async (email: string, code: string) => {
  const res = await fetch(`${API_URL}/api/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  return res.json();
};

export default function AuthPanel({ onVolver }: { onVolver?: () => void }) {
  const navigate = useNavigate();
  const { modoOscuro } = useTheme();
  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", documento: "", direccion: "", telefono: "", ciudad: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarPasswordReg, setMostrarPasswordReg] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [codigoVerificacion, setCodigoVerificacion] = useState("");
  const [emailVerificado, setEmailVerificado] = useState(false);

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
    if (!emailVerificado) {
      setCargando(true);
      setError("");
      try {
        const result = await sendVerificationCode(form.email);
        if (result.error) {
          setError(result.error);
          setCargando(false);
          return;
        }
        setVerificando(true);
        setCargando(false);
        setError("Código enviado! Revisa tu correo.");
      } catch (err: any) {
        setCargando(false);
        setError("Error: " + err.message);
      }
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
      setCargando(false);
      setModo("login");
      setError("Registro exitoso! Ya puedes iniciar sesión.");
    } catch (err: any) {
      setCargando(false);
      setError("Error: " + err.message);
    }
  };

  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleVerificarCodigo = async () => {
    if (!codigoVerificacion) {
      setError("Ingresa el código de verificación");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const result = await verifyCode(form.email, codigoVerificacion);
      if (result.error) {
        setError(result.error);
        setCargando(false);
        return;
      }
      setEmailVerificado(true);
      setVerificando(false);
      setCargando(false);
      setError("Email verificado! Ahora completa el registro.");
    } catch (err: any) {
      setCargando(false);
      setError("Error: " + err.message);
    }
  };

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
        ) : verificando ? (
          <div className="mt-6 w-full max-w-sm mx-auto">
            <p className="text-sm mb-3" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>
              Ingresa el código enviado a {form.email}
            </p>
            <input
              type="text"
              placeholder="Código de 6 dígitos"
              value={codigoVerificacion}
              onChange={e => setCodigoVerificacion(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`w-full px-3 py-2 rounded-md border outline-0 ${bgInput}`}
              style={{ backgroundColor: modoOscuro ? '#1f2937' : '#fff', borderColor: modoOscuro ? '#374151' : '#a78bfa' }}
              maxLength={6}
            />
            <button onClick={handleVerificarCodigo} disabled={cargando} className="w-full mt-4 py-3 rounded-md font-semibold disabled:opacity-50 bg-violet-500 text-white hover:bg-violet-600">
              {cargando ? "Verificando..." : "Verificar código"}
            </button>
            <button onClick={() => { setVerificando(false); setEmailVerificado(false); setCodigoVerificacion(''); }} className="w-full mt-2 text-sm hover:underline" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>
              ← Cambiar correo
            </button>
            <button onClick={async () => { setCargando(true); await sendVerificationCode(form.email); setCargando(false); setError("Código reenviado!"); }} disabled={cargando} className="w-full mt-2 text-sm hover:underline" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>
              Reenviar código
            </button>
          </div>
        ) : (
          <form className="mt-6 w-full max-w-sm mx-auto" onSubmit={(e) => { e.preventDefault(); handleRegistro(); }}>
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

            <button type="submit" disabled={cargando} className="w-full mt-4 py-3 rounded-md font-semibold disabled:opacity-50 bg-violet-500 text-white hover:bg-violet-600">
              {cargando ? "Cargando..." : "Registrarse"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
