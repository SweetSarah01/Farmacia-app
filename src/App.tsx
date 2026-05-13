import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useSession } from "./components/common/useSession";
import { Spinner } from "./components/common/Spinner";
import AuthPanel from "./components/auth/AuthPanel";
import BlobsAuth from "./components/auth/BlobsAuth";
import VistaCliente from "./components/cliente/VistaCliente";
import PanelFarmaceutico from "./components/farmaceutico/PanelFarmaceutico";
import PanelDomiciliario from "./components/domiciliario/PanelDomiciliario";
import SuperAdminPanel from "./components/admin/SuperAdminPanel";
import AdminPharmacyPanel from "./components/admin/AdminPharmacyPanel";
import CatalogoPublico from "./components/publico/CatalogoPublico";
import VerifyEmail from "./components/auth/VerifyEmail";

export const ThemeContext = createContext<{ modoOscuro: boolean; setModoOscuro: (v: boolean) => void }>({ modoOscuro: true, setModoOscuro: () => {} });
export const useTheme = () => useContext(ThemeContext);

function AppContent() {
  const { session, perfil, cargando } = useSession();
  const [mostrarAuth, setMostrarAuth] = useState(false);
  const [vista, setVista] = useState("cliente");
  const [subVista, setSubVista] = useState("");
  const [modoOscuro, setModoOscuro] = useState(true);
  const [perfilOverride, setPerfilOverride] = useState<any>(null);
  const perfilActual = perfilOverride || perfil;

  const [verifyStatus, setVerifyStatus] = useState<{ email: string; token?: string; status: "idle" | "loading" | "success" | "error"; msg?: string }>({ email: "", status: "idle" });
  const [verifyDone, setVerifyDone] = useState(false);

  useEffect(() => {
    if (verifyDone) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");
    if (token && email) {
      setVerifyStatus({ email, token, status: "loading" });
      fetch("/api/confirmar-verificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token })
      }).then(r => r.json()).then(async (result) => {
        if (result.success && result.data) {
          const { error } = await supabase.auth.signUp({
            email: result.data.email,
            password: result.data.password,
            options: { data: { nombre: result.data.name, documento: result.data.documento, telefono: result.data.telefono, direccion: result.data.direccion, ciudad: result.data.ciudad } }
          });
          if (error) {
            setVerifyStatus({ email, status: "error", msg: error.message });
          } else {
            setVerifyStatus({ email, status: "success", msg: "Cuenta verificada exitosamente. Ya puedes iniciar sesión." });
          }
        } else {
          setVerifyStatus({ email, status: "error", msg: result.error || "Error al verificar" });
        }
        setVerifyDone(true);
      }).catch(() => {
        setVerifyStatus({ email, status: "error", msg: "Error de conexión" });
        setVerifyDone(true);
      });
    }
  }, [verifyDone]);

  const cerrarSesion = () => supabase.auth.signOut();

  useEffect(() => {
    setPerfilOverride(null);
  }, [perfil?.id]);

  useEffect(() => {
    const handler = (e: Event) => setPerfilOverride((e as CustomEvent).detail);
    window.addEventListener("perfil-actualizado", handler);
    return () => window.removeEventListener("perfil-actualizado", handler);
  }, []);

  const bgMain = modoOscuro ? "min-h-screen bg-slate-900 text-white font-sans" : "min-h-screen bg-violet-50 text-slate-800 font-sans";
  const bgNav = modoOscuro ? "bg-gradient-to-r from-slate-800 via-violet-900/30 to-slate-800 border-b border-slate-700" : "bg-gradient-to-r from-violet-100 via-violet-200 to-violet-100 border-b border-violet-300";
  const bgBtnActivo = "bg-violet-600 text-white shadow";
  const bgBtnInactivo = modoOscuro ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-violet-600 hover:text-white hover:bg-violet-100";

  const rol = perfilActual?.rol || "cliente";
  const esSuperAdmin = rol === "superadmin";
  const esAdminFarmacia = rol === "admin";
const esFarmaceutico = rol === "farmaceutico";
  const esDomiciliario = rol === "domiciliario";

  const vistaPorRol = esSuperAdmin ? "superadmin" : esAdminFarmacia ? "admin" : esFarmaceutico ? "farmaceutico" : esDomiciliario ? "domiciliario" : "cliente";

  useEffect(() => {
    if (perfilActual) {
      setVista(vistaPorRol);
      if (vistaPorRol === "cliente") setSubVista("catalogo");
      else if (vistaPorRol === "farmaceutico") setSubVista("formulas");
      else if (vistaPorRol === "domiciliario") setSubVista("disponibles");
      else if (vistaPorRol === "admin") setSubVista("mi-farmacia");
    }
  }, [perfilActual?.rol]);

  const rolLabel = esSuperAdmin ? "🌐 Super Admin" : esAdminFarmacia ? "🏪 Admin" : esFarmaceutico ? "⚕️ Farmacéutico" : esDomiciliario ? "🚚 Domiciliario" : "👤 Cliente";

  const subVistas = vista === "cliente"
    ? [{ key: "inicio", label: "🏠" }, { key: "catalogo", label: "💊 Todas" }, { key: "carrito", label: "🛒" }, { key: "pedidos", label: "📋" }, { key: "formulas", label: "🩺" }, { key: "cuenta", label: "👤" }]
    : vista === "farmaceutico"
    ? [{ key: "formulas", label: "📝" }, { key: "inventario", label: "📦" }, { key: "pedidos", label: "📋" }, { key: "presencial", label: "💰" }, { key: "historial", label: "📊" }]
    : vista === "domiciliario"
    ? [{ key: "disponibles", label: "📦" }]
    : vista === "admin"
    ? [{ key: "productos", label: "💊" }, { key: "pedidos", label: "📋" }, { key: "historial", label: "📊" }]
    : [];

  const btnTheme = (
    <button onClick={() => setModoOscuro(!modoOscuro)} className="w-9 h-9 flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-500 text-white text-lg transition-colors" title={modoOscuro ? "Modo claro" : "Modo oscuro"}>
      {modoOscuro ? "☀️" : "🌙"}
    </button>
  );

  if (verifyStatus.status !== "idle") {
    return (
      <ThemeContext.Provider value={{ modoOscuro, setModoOscuro }}>
        <VerifyEmail status={verifyStatus.status} msg={verifyStatus.msg} email={verifyStatus.email} onVolver={() => { setVerifyStatus({ email: "", status: "idle" }); setVerifyDone(false); }} />
      </ThemeContext.Provider>
    );
  }

  if (cargando) {
    return (
      <ThemeContext.Provider value={{ modoOscuro, setModoOscuro }}>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-5xl mb-4">💊</div>
            <Spinner />
          </div>
        </div>
      </ThemeContext.Provider>
    );
  }

  if (session && perfilActual) {
return (
    <ThemeContext.Provider value={{ modoOscuro, setModoOscuro }}>
      <div className={bgMain}>
        <nav className={`${bgNav} px-4 py-3 flex flex-col gap-3 sticky top-0 z-40`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💊</span>
              <span className={`font-bold text-lg sm:text-xl ${modoOscuro ? "bg-gradient-to-r from-violet-400 to-violet-200 bg-clip-text text-transparent" : "bg-gradient-to-r from-violet-600 to-violet-800 bg-clip-text text-transparent"}`}>FarmaciaApp</span>
              <span className={`text-xs sm:text-sm ml-1 sm:ml-2 ${modoOscuro ? "text-slate-400" : "text-slate-500"}`}>|</span>
              <span className={`text-xs sm:text-sm font-medium hidden sm:inline ${modoOscuro ? "text-slate-400" : "text-slate-500"}`}>{rolLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              {btnTheme}
              <button onClick={cerrarSesion} className={`px-2 sm:px-3 py-1 rounded text-sm ${modoOscuro ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>Salir</button>
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {subVistas.map(sv => (
              <button key={sv.key} onClick={() => setSubVista(sv.key)} className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap min-h-[44px] ${subVista === sv.key ? bgBtnActivo : bgBtnInactivo}`}>
                <span className="text-lg sm:hidden">{sv.label}</span>
                <span className="hidden sm:inline">{sv.label}</span>
              </button>
            ))}
          </div>
        </nav>
          {vista === "cliente" && <VistaCliente perfil={perfilActual} cerrarSesion={cerrarSesion} seccion={subVista} setSeccion={setSubVista} />}
          {vista === "farmaceutico" && <PanelFarmaceutico perfil={perfilActual} cerrarSesion={cerrarSesion} seccion={subVista} setSeccion={setSubVista} />}
          {vista === "domiciliario" && <PanelDomiciliario perfil={perfilActual} cerrarSesion={cerrarSesion} />}
          {vista === "admin" && <AdminPharmacyPanel perfil={perfilActual} cerrarSesion={cerrarSesion} seccion={subVista} setSeccion={setSubVista} />}
          {vista === "superadmin" && <SuperAdminPanel cerrarSesion={cerrarSesion} />}
        </div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ modoOscuro, setModoOscuro }}>
      <div className={bgMain}>
        <nav className={`${bgNav} px-4 sm:px-7 flex items-center justify-between h-12 sm:h-14`}>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">💊</span>
            <span className={`font-bold text-base sm:text-lg ${modoOscuro ? "bg-gradient-to-r from-violet-400 to-violet-200 bg-clip-text text-transparent" : "bg-gradient-to-r from-violet-600 to-violet-800 bg-clip-text text-transparent"}`}>FarmaciaApp</span>
          </div>
          <div className="flex items-center gap-2">
            {btnTheme}
            {!session && (
              <button className="bg-violet-600 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-violet-700 text-sm sm:text-base min-h-[40px]" onClick={() => setMostrarAuth(true)}>
                Iniciar sesión
              </button>
            )}
          </div>
        </nav>
        <CatalogoPublico onLogin={() => setMostrarAuth(true)} />

        {mostrarAuth && !session && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setMostrarAuth(false)}>
            <BlobsAuth />
            <div onClick={e => e.stopPropagation()}>
              <AuthPanel onVolver={() => setMostrarAuth(false)} />
            </div>
          </div>
        )}
      </div>
    </ThemeContext.Provider>
  );
}

export default function App() {
  return <BrowserRouter><AppContent /></BrowserRouter>;
}