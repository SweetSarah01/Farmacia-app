import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useTheme } from "../../App";
import BlobsAuth from "../auth/BlobsAuth";



function fmtCOP(price: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(price);
}

function RegistrationModal({ onClose, onSuccess, onLogin }: { onClose: () => void; onSuccess: () => void; onLogin: () => void }) {
  const { modoOscuro } = useTheme();
  const bgCard = modoOscuro ? "bg-slate-800/80" : "bg-white/80";
  const bgInput = modoOscuro ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-800";
  const [tipo, setTipo] = useState<"cliente" | "farmacia">("cliente");
  const [cargando, setCargando] = useState(false);
  
  const [cliente, setCliente] = useState({ 
    nombre: "", 
    nombre_usuario: "",
    email: "", 
    password: "", 
    documento: "",
    telefono: "", 
    direccion: "",
    barrio: "",
    fecha_nacimiento: "" 
  });
  const [error, setError] = useState("");
  
  const [farmacia, setFarmacia] = useState({
    nombre: "", nit: "", direccion: "", barrio: "", ciudad: "Montería", telefono: "",
    email: "", password: "", responsable_nombre: "", responsable_documento: ""
  });

  const [verificando, setVerificando] = useState(false);
  const [emailVerif, setEmailVerif] = useState("");

  const handleClienteSubmit = async () => {
    setError("");
    if (!cliente.nombre?.trim() || !cliente.documento?.trim() || !cliente.email?.trim() || !cliente.password || !cliente.telefono?.trim() || !cliente.direccion?.trim() || !cliente.fecha_nacimiento) {
      setError("Los campos con * son obligatorios");
      return;
    }
    setCargando(true);
    try {
      const res = await fetch('/api/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cliente.email.trim(),
          name: cliente.nombre.trim(),
          password: cliente.password,
          documento: cliente.documento.trim(),
          telefono: cliente.telefono.trim(),
          direccion: cliente.direccion.trim(),
          ciudad: '',
          tipo: 'cliente',
          nombre_usuario: cliente.nombre_usuario.trim(),
          barrio: cliente.barrio.trim(),
          fecha_nacimiento: cliente.fecha_nacimiento,
        })
      });
      const result = await res.json();
      setCargando(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEmailVerif(cliente.email.trim());
      setVerificando(true);
    } catch (err: any) {
      setCargando(false);
      setError(err.message);
    }
  };

  const handleFarmaciaSubmit = async () => {
    setError("");
    if (!farmacia.nombre || !farmacia.nit || !farmacia.direccion || !farmacia.telefono || !farmacia.email || !farmacia.password || !farmacia.responsable_nombre || !farmacia.responsable_documento) {
      setError("Todos los campos son obligatorios");
      return;
    }
    setCargando(true);
    try {
      const res = await fetch('/api/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: farmacia.email,
          name: farmacia.responsable_nombre,
          password: farmacia.password,
          documento: farmacia.responsable_documento,
          telefono: farmacia.telefono,
          direccion: farmacia.direccion,
          ciudad: farmacia.ciudad,
          tipo: 'farmacia',
          nombre_farmacia: farmacia.nombre,
          nit: farmacia.nit,
          barrio: farmacia.barrio,
        })
      });
      const result = await res.json();
      setCargando(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEmailVerif(farmacia.email);
      setVerificando(true);
    } catch (err: any) {
      setCargando(false);
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <BlobsAuth />
      <div className={`${bgCard} rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-hide relative z-10`}>
        <div className="relative flex items-center justify-center mb-4">
          <button
            onClick={onClose}
            className="absolute left-0 p-2 w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center hover:bg-violet-500 hover:text-white transition-all text-sm font-bold"
          >
            ←
          </button>
          <h2 className="text-xl font-bold text-violet-600 w-full text-center">Crear cuenta</h2>
        </div>

        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => setTipo("cliente")}
            className={`flex-1 py-2 rounded-lg font-semibold ${tipo === "cliente" ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-600"}`}
          >
            Cliente
          </button>
          <button 
            onClick={() => setTipo("farmacia")}
            className={`flex-1 py-2 rounded-lg font-semibold ${tipo === "farmacia" ? "bg-green-600 text-white" : "bg-slate-200 text-slate-600"}`}
          >
            Farmacia
          </button>
        </div>

        {verificando ? (
          <div className="space-y-3 text-center">
            <div className="text-5xl mb-2">📧</div>
            <p className="text-lg font-semibold" style={{ color: modoOscuro ? '#fff' : '#1f2937' }}>
              Revisa tu correo
            </p>
            <p className="text-sm" style={{ color: modoOscuro ? '#9ca3af' : '#6b7280' }}>
              Enviamos un enlace de verificación a <br/>
              <strong style={{ color: '#a78bfa' }}>{emailVerif}</strong>
            </p>
            <p className="text-xs" style={{ color: modoOscuro ? '#6b7280' : '#9ca3af' }}>
              Haz clic en el enlace del correo para activar tu cuenta.<br/>
              El enlace expira en 15 minutos.
            </p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        ) : tipo === "cliente" ? (
          <div className="space-y-3">
            <input placeholder="Nombre completo *" value={cliente.nombre} onChange={e => setCliente(c => ({ ...c, nombre: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            <input placeholder="Documento de identidad *" value={cliente.documento} onChange={e => setCliente(c => ({ ...c, documento: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
             <input placeholder="Correo electrónico *" type="email" value={cliente.email} onChange={e => setCliente(c => ({ ...c, email: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
             <input placeholder="Contraseña *" type="password" value={cliente.password} onChange={e => setCliente(c => ({ ...c, password: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
             <input placeholder="Número de teléfono *" value={cliente.telefono} onChange={e => setCliente(c => ({ ...c, telefono: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
             <input placeholder="Dirección *" value={cliente.direccion} onChange={e => setCliente(c => ({ ...c, direccion: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            <input placeholder="Barrio" value={cliente.barrio} onChange={e => setCliente(c => ({ ...c, barrio: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            <input placeholder="Fecha de nacimiento *" type="date" value={cliente.fecha_nacimiento} onChange={e => setCliente(c => ({ ...c, fecha_nacimiento: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            <input placeholder="Nombre de usuario (opcional)" value={cliente.nombre_usuario} onChange={e => setCliente(c => ({ ...c, nombre_usuario: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={handleClienteSubmit} disabled={cargando} className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-500 disabled:opacity-50">
              {cargando ? "Enviando..." : "Crear cuenta"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-bold text-green-600 mb-2">DATOS DE LA FARMACIA</div>
            <input placeholder="Nombre de la farmacia *" value={farmacia.nombre} onChange={e => setFarmacia(f => ({ ...f, nombre: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            <input placeholder="NIT *" value={farmacia.nit} onChange={e => setFarmacia(f => ({ ...f, nit: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
             <input placeholder="Dirección *" value={farmacia.direccion} onChange={e => setFarmacia(f => ({ ...f, direccion: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Barrio" value={farmacia.barrio} onChange={e => setFarmacia(f => ({ ...f, barrio: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
              <input placeholder="Ciudad" value={farmacia.ciudad} onChange={e => setFarmacia(f => ({ ...f, ciudad: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            </div>
             <input placeholder="Teléfono *" value={farmacia.telefono} onChange={e => setFarmacia(f => ({ ...f, telefono: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            
            <div className="text-sm font-bold text-green-600 mt-4 mb-2">DATOS DEL ADMINISTRADOR</div>
            <input placeholder="Nombre del administrador *" value={farmacia.responsable_nombre} onChange={e => setFarmacia(f => ({ ...f, responsable_nombre: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            <input placeholder="Documento del administrador *" value={farmacia.responsable_documento} onChange={e => setFarmacia(f => ({ ...f, responsable_documento: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
             <input placeholder="Correo electrónico *" type="email" value={farmacia.email} onChange={e => setFarmacia(f => ({ ...f, email: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
             <input placeholder="Contraseña *" type="password" value={farmacia.password} onChange={e => setFarmacia(f => ({ ...f, password: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border ${bgInput}`} />
            
            <button onClick={handleFarmaciaSubmit} disabled={cargando} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
              {cargando ? "Enviando..." : "Enviar solicitud"}
            </button>
            <p className="text-xs text-slate-500 text-center">Tu solicitud sera revisada por un administrador</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CatalogoPublico({ onLogin }: { onLogin: () => void }) {
  const { modoOscuro } = useTheme();
  const bgMain = modoOscuro ? "text-white" : "text-slate-800";
  const bgCard = modoOscuro ? "bg-slate-800" : "bg-white";
  const bgInput = modoOscuro ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-800";
  const headerBg = modoOscuro ? "bg-gradient-to-r from-slate-800 via-violet-900/40 to-slate-800" : "bg-gradient-to-r from-violet-300 via-violet-200 to-violet-300";
  const headerText = modoOscuro ? "text-white" : "text-violet-900";
  const headerSubtext = modoOscuro ? "text-violet-300" : "text-violet-700";
  const bgCantidad = modoOscuro ? "bg-slate-700" : "bg-violet-50";
  const btnCantidad = modoOscuro 
    ? "bg-slate-600 text-slate-200 hover:bg-violet-500 hover:text-white" 
    : "bg-white text-slate-700 shadow-sm hover:bg-violet-600 hover:text-white";
  
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [pharmacySeleccionada, setPharmacySeleccionada] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [carrito, setCarrito] = useState<Record<number, number>>({});

  const totalEnCarrito = Object.values(carrito).reduce((a, b) => a + b, 0);

  const modificarCantidad = (productoId: number, delta: number, stock: number) => {
    setCarrito(prev => {
      const actual = prev[productoId] || 0;
      const nuevo = Math.max(0, Math.min(stock, actual + delta));
      if (nuevo === 0) {
        const { [productoId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productoId]: nuevo };
    });
  };

  useEffect(() => {
    supabase.from("pharmacies").select("*").eq("estado", "aprobado").order("nombre")
      .then(({ data }: any) => {
        setPharmacies(data || []);
      });
  }, []);

  useEffect(() => {
    if (pharmacySeleccionada?.id) {
      supabase.from("productos").select("*").eq("pharmacy_id", pharmacySeleccionada.id).order("nombre")
        .then(({ data }: any) => setProductos(data || []));
    } else if (!pharmacySeleccionada) {
      supabase.from("productos").select("*").order("nombre")
        .then(({ data }: any) => setProductos(data || []));
    }
  }, [pharmacySeleccionada]);

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const irAlCarrito = () => {
    if (totalEnCarrito === 0) {
      alert("Agrega productos al carrito primero");
      return;
    }
    onLogin();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-slate-800">
      {mostrarRegistro && <RegistrationModal onClose={() => setMostrarRegistro(false)} onSuccess={() => setMostrarRegistro(false)} onLogin={onLogin} />}
      
      <div className={`${headerBg} rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 -mx-4 sm:-mx-6 ${headerText}`}>
        <div className={`text-xl sm:text-2xl font-extrabold mb-1 ${modoOscuro ? "bg-gradient-to-r from-violet-400 to-violet-200 bg-clip-text text-transparent" : "bg-gradient-to-r from-violet-600 to-violet-800 bg-clip-text text-transparent"}`}>FarmaciaApp</div>
        <div className={`text-sm mb-3 ${headerSubtext}`}>Medicamentos a domicilio en Monteria</div>
        
        <div className="flex gap-2 sm:gap-3">
          <button className="flex-1 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-[1.02] min-h-[44px]" onClick={onLogin}>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
              <span className="hidden sm:inline">Iniciar sesión</span>
              <span className="sm:hidden">Iniciar sesión</span>
            </span>
          </button>
          <button className="flex-1 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-[1.02] min-h-[44px]" onClick={() => setMostrarRegistro(true)}>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
              <span className="hidden sm:inline">Crear cuenta</span>
              <span className="sm:hidden">Crear cuenta</span>
            </span>
          </button>
        </div>
        
        <div>
          <div className={`text-xs mb-1 font-semibold ${modoOscuro ? "text-violet-300" : "text-violet-800"}`}>Selecciona una farmacia:</div>
          <div className="flex flex-wrap gap-2">
            {pharmacies.map(p => (
              <button 
                key={p.id} 
                onClick={() => setPharmacySeleccionada(p.id === pharmacySeleccionada?.id ? null : p)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 min-h-[36px] ${
                  pharmacySeleccionada?.id === p.id 
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30" 
                    : `${modoOscuro ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-800"} hover:bg-violet-200`
                }`}
              >
                {p.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pharmacySeleccionada && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setPharmacySeleccionada(null)} className="text-violet-600 hover:text-violet-800 font-medium min-h-[44px]">
              ← Volver
            </button>
            <span className="text-slate-400">|</span>
            <span className="font-bold text-violet-600 text-sm sm:text-base">{pharmacySeleccionada.nombre}</span>
          </div>
          {totalEnCarrito > 0 && (
            <div className="bg-violet-600 text-white px-3 sm:px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-violet-600/30">
              {totalEnCarrito} en carrito
            </div>
          )}
        </div>
      )}
        
      <input 
        placeholder="Buscar producto..." 
        value={busqueda} 
        onChange={e => setBusqueda(e.target.value)} 
        className={`w-full px-4 py-3 rounded-xl border mb-4 sm:mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${bgInput} text-base`}
      />
        
      {filtrados.length === 0 ? (
        <div className={`text-center py-12 ${bgCard} rounded-xl`}>No hay productos disponibles</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtrados.map(p => {
            const cantidad = carrito[p.id] || 0;
            return (
              <div key={p.id} className={`${bgCard} rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col gap-2 sm:gap-3 border border-slate-200 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-300`}>
                <div className="text-3xl sm:text-4xl text-center">{p.imagen || "💊"}</div>
                {p.formula_medica && (
                  <span className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full text-center">Formula</span>
                )}
                <div className="font-bold text-center text-sm leading-tight text-violet-600">{p.nombre}</div>
                <div className="text-slate-400 text-xs text-center">{p.categoria}</div>
                <div className={`text-xs text-center font-semibold ${p.stock <= 5 ? "text-red-500" : "text-green-600"}`}>
                  {p.stock > 0 ? `${p.stock} disponibles` : "Sin stock"}
                </div>
                <div className="text-violet-600 font-bold text-lg sm:text-xl text-center">{fmtCOP(p.precio)}</div>
                
                <div className={`flex items-center justify-center gap-2 ${bgCantidad} rounded-full px-2 py-1`}>
                  <button 
                    onClick={() => modificarCantidad(p.id, -1, p.stock)}
                    disabled={cantidad === 0}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-md text-lg font-bold transition-all active:scale-90 disabled:opacity-30 ${btnCantidad}`}
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-violet-600">{cantidad}</span>
                  <button 
                    onClick={() => modificarCantidad(p.id, 1, p.stock)}
                    disabled={cantidad >= p.stock || p.stock === 0}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-md text-lg font-bold transition-all active:scale-90 disabled:opacity-30 ${btnCantidad}`}
                  >
                    +
                  </button>
                </div>
                
                <button 
                  onClick={irAlCarrito}
                  disabled={cantidad === 0}
                  className="w-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white py-2 sm:py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[44px]"
                >
                  🛒 Ir al carrito
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}