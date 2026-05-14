import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useTheme } from "../../App";

function fmtCOP(price: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(price);
}

function fmtFecha(date: string) {
  return new Date(date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SuperAdminPanel({ cerrarSesion, seccion, setSeccion }: any) {
  const { modoOscuro } = useTheme();
  const bgMain = modoOscuro ? "min-h-screen bg-slate-900 text-white" : "min-h-screen bg-slate-100 text-slate-800";
  const bgCard = modoOscuro
    ? "bg-slate-800 border-l-4 border-violet-500 rounded-xl p-3"
    : "bg-white border-l-4 border-violet-400 rounded-xl p-3";
  const bgLight = modoOscuro ? "bg-slate-800" : "bg-slate-100";
  const bgInput = modoOscuro ? "bg-slate-700 border-violet-500/30" : "bg-white border-violet-300";
  const statColors = {
    primary: "text-slate-500",
    success: "text-slate-500",
    warning: "text-slate-500",
    danger: "text-slate-500",
    secondary: "text-slate-500"
  };
  const glassCard = modoOscuro
    ? "rounded-2xl p-4 text-center border border-violet-500/50 bg-violet-950/50 backdrop-blur hover:bg-violet-900/70 transition-all"
    : "rounded-2xl p-4 text-center border border-violet-300 bg-violet-100 shadow-md hover:shadow-lg transition-all";
  
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPharmacies: 0, approved: 0, pending: 0, rejected: 0,
    totalUsers: 0, superAdmins: 0, admins: 0, farmaceuticos: 0, domiciliario: 0, clientes: 0,
    totalPedidos: 0, pedidosPendientes: 0, pedidosEnCamino: 0, pedidosEntregados: 0, pedidosCancelados: 0,
    totalProductos: 0
  });
  const [cargando, setCargando] = useState(true);
  const [rechazoModal, setRechazoModal] = useState<any>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [editandoUsuario, setEditandoUsuario] = useState<any>(null);
  const [nuevoRol, setNuevoRol] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    cargarDatos();
    
    // Suscribirse a nuevas solicitudes de farmacias
    const subscription = supabase
      .channel('pharmacies-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pharmacies' },
        (payload) => {
          console.log('Cambio detectado en pharmacies:', payload);
          cargarDatos();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const cargarDatos = async (filtroFechaInicio?: string, filtroFechaFin?: string) => {
    setCargando(true);
    const { data: pharms } = await supabase.from("pharmacies").select("*").order("created_at", { ascending: false });
    setPharmacies(pharms || []);
    
    // Filtrar pedidos por rango de fechas si se especifica
    let pedidosQuery = supabase.from("pedidos").select("*");
    if (filtroFechaInicio) {
      pedidosQuery = pedidosQuery.gte("created_at", filtroFechaInicio);
    }
    if (filtroFechaFin) {
      const fechaFinAjustada = new Date(filtroFechaFin);
      fechaFinAjustada.setDate(fechaFinAjustada.getDate() + 1);
      pedidosQuery = pedidosQuery.lt("created_at", fechaFinAjustada.toISOString().split('T')[0]);
    }
    const { data: pedidos } = await pedidosQuery;
    
    const { data: productos } = await supabase.from("productos").select("*");
    const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    
    const pharmMap: Record<string, string> = {};
    (pharms || []).forEach(p => { pharmMap[p.id] = p.nombre; });
    const usersConFarmacia = (users || []).map(u => ({
      ...u,
      pharmacy_nombre: u.pharmacy_id ? pharmMap[u.pharmacy_id] || null : null
    }));
    setUsuarios(usersConFarmacia);
    
    const approved = (pharms || []).filter(p => p.estado === "aprobado").length;
    const pending = (pharms || []).filter(p => p.estado === "pendiente").length;
    const rejected = (pharms || []).filter(p => p.estado === "rechazado").length;
    const superAdmins = (users || []).filter(u => u.rol === "superadmin").length;
    const admins = (users || []).filter(u => u.rol === "admin").length;
    const farmaceuticos = (users || []).filter(u => u.rol === "farmaceutico").length;
    const domiciliario = (users || []).filter(u => u.rol === "domiciliario").length;
    const clientes = (users || []).filter(u => u.rol === "cliente").length;
    const pedidosPendientes = (pedidos || []).filter(p => p.estado === "pendiente").length;
    const pedidosEnCamino = (pedidos || []).filter(p => p.estado === "en_camino").length;
    const pedidosEntregados = (pedidos || []).filter(p => p.estado === "entregado").length;
    const pedidosCancelados = (pedidos || []).filter(p => p.estado === "cancelado").length;
    setStats({
      totalPharmacies: pharms?.length || 0,
      approved, pending, rejected,
      totalUsers: users?.length || 0,
      superAdmins, admins, farmaceuticos, domiciliario, clientes,
      totalPedidos: pedidos?.length || 0,
      pedidosPendientes, pedidosEnCamino, pedidosEntregados, pedidosCancelados,
      totalProductos: productos?.length || 0
    });
    setCargando(false);
  };

  const aprobarPharmacy = async (id: string) => {
    const pharmacy = pharmacies.find(p => p.id === id);
    if (!pharmacy) return;
    const { error: updateError } = await supabase.from("pharmacies").update({
      estado: "aprobado",
      fecha_aprobacion: new Date().toISOString()
    }).eq("id", id);
    if (updateError) {
      alert("Error al aprobar: " + updateError.message);
      return;
    }
    alert(`✅ Farmacia "${pharmacy.nombre}" aprobada!\n\nEl administrador puede iniciar sesión.`);
    cargarDatos();
  };

  const rechazarPharmacy = async () => {
    if (!rechazoModal || !motivoRechazo) {
      alert("Escribe el motivo del rechazo");
      return;
    }
    await supabase.from("pharmacies").update({
      estado: "rechazado",
      motivo_rechazo: motivoRechazo
    }).eq("id", rechazoModal.id);
    alert("Farmacia rechazada ❌");
    setRechazoModal(null);
    setMotivoRechazo("");
    cargarDatos();
  };

  const eliminarPharmacy = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar la pharmacy "${nombre}"? Esto eliminará TODO.`)) return;
    try {
      const { data: productos } = await supabase.from("productos").select("id").eq("pharmacy_id", id);
      if (productos && productos.length > 0) {
        for (const p of productos) {
          await supabase.from("pedido_productos").delete().eq("producto_id", p.id);
        }
        await supabase.from("productos").delete().eq("pharmacy_id", id);
      }
      const { data: pedidos } = await supabase.from("pedidos").select("id").eq("pharmacy_id", id);
      if (pedidos && pedidos.length > 0) {
        for (const ped of pedidos) {
          await supabase.from("pedido_productos").delete().eq("pedido_id", ped.id);
        }
        await supabase.from("pedidos").delete().eq("pharmacy_id", id);
      }
      await supabase.from("profiles").delete().eq("pharmacy_id", id);
      const { error } = await supabase.from("pharmacies").delete().eq("id", id);
      if (error) {
        alert("Error: " + error.message);
      } else {
        alert("Farmacia eliminada ✅");
        cargarDatos();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const cambiarRol = async (userId: string) => {
    console.log("🎯 Cambiar rol llamado para:", userId, "nuevo rol:", nuevoRol);
    if (!nuevoRol || !userId) {
      console.log("❌ Faltan datos");
      return;
    }
    const { error } = await supabase.from("profiles").update({ rol: nuevoRol }).eq("id", userId);
    console.log("✅ Resultado:", error);
    setEditandoUsuario(null);
    setNuevoRol("");
    cargarDatos();
  };

  const eliminarUsuario = async (userId: string) => {
    if (!confirm("¿Eliminar este usuario? También se eliminarán sus pedidos y su cuenta de Auth.")) return;
    try {
      const { data: pedidos } = await supabase.from("pedidos").select("id")
        .or(`cliente_id.eq.${userId},domiciliario_id.eq.${userId}`);
      if (pedidos && pedidos.length > 0) {
        for (const ped of pedidos) {
          await supabase.from("pedido_productos").delete().eq("pedido_id", ped.id);
        }
        await supabase.from("pedidos").delete().or(`cliente_id.eq.${userId},domiciliario_id.eq.${userId}`);
      }
      const res = await fetch("/api/eliminar-usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const authResult = await res.json();
      if (!authResult.success) {
        alert("Error al borrar de Auth: " + (authResult.error || "desconocido") + ". No se borró el perfil.");
        return;
      }
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) {
        alert("Error al borrar perfil: " + error.message);
      } else {
        alert("Usuario eliminado completamente de Auth y perfiles");
        cargarDatos();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className={`min-h-screen font-sans ${bgMain}`}>
      {rechazoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`${bgCard} rounded-2xl p-6 max-w-md`}>
            <h2 className="text-xl font-bold mb-4">❌ Rechazar Farmacia</h2>
            <p className="text-slate-500 mb-4">Farmacia: {rechazoModal.nombre}</p>
            <textarea
              placeholder="Motivo del rechazo *"
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${bgInput} h-24`}
            />
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-slate-500 text-white py-2 rounded-lg" onClick={() => setRechazoModal(null)}>Cancelar</button>
              <button className="flex-1 bg-red-600 text-white py-2 rounded-lg" onClick={rechazarPharmacy}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-violet-600 mb-4 sm:mb-6">🌐 Panel Super Administrador</h1>

        <div className="flex gap-2 mb-4 sm:mb-6 flex-wrap sm:flex-nowrap overflow-x-auto pb-2">
          {[
            { key: "dashboard", label: "📊" },
            { key: "farmacias", label: "🏪" },
            { key: "usuarios", label: "👥" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap min-h-[44px] ${
                tab === t.key ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white"
              }`}
            >
              <span className="sm:hidden text-lg">{t.label}</span>
              <span className="hidden sm:inline">{t.label} {t.key === "dashboard" ? "Dashboard" : t.key === "farmacias" ? "Farmacias" : "Usuarios"}</span>
            </button>
          ))}
        </div>

        {tab === "dashboard" && (
          <>
            <div className={`mb-6 rounded-2xl p-4 border ${
              modoOscuro 
                ? "bg-violet-950/30 backdrop-blur border-violet-500/30" 
                : "bg-violet-50 border-violet-200 shadow-sm"
            }`}>
              <h3 className={`text-lg font-bold mb-3 ${modoOscuro ? "text-violet-300" : "text-violet-700"}`}>📅 Filtrar por rango de fechas</h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className={`block text-xs mb-1 ${modoOscuro ? "text-violet-300" : "text-violet-600"}`}>Fecha inicio</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      modoOscuro 
                        ? "bg-slate-800 border-violet-500/30 text-white" 
                        : "bg-white border-violet-300 text-slate-800"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${modoOscuro ? "text-violet-300" : "text-violet-600"}`}>Fecha fin</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={e => setFechaFin(e.target.value)}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      modoOscuro 
                        ? "bg-slate-800 border-violet-500/30 text-white" 
                        : "bg-white border-violet-300 text-slate-800"
                    }`}
                  />
                </div>
                <button
                  onClick={() => cargarDatos(fechaInicio, fechaFin)}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition"
                >
                  🔍 Filtrar
                </button>
                {(fechaInicio || fechaFin) && (
                  <button
                    onClick={() => {
                      setFechaInicio("");
                      setFechaFin("");
                      cargarDatos();
                    }}
                    className={`px-4 py-2 rounded-lg text-sm transition ${
                      modoOscuro 
                        ? "bg-slate-700 text-white hover:bg-slate-600" 
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    ✕ Limpiar
                  </button>
                )}
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4">🏪 Farmacias</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.secondary}`}>{stats.totalPharmacies}</div>
                <div className={`text-xs ${statColors.secondary} font-medium`}>Total</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.primary}`}>{stats.approved}</div>
                <div className={`text-xs ${statColors.primary} font-medium`}>Aprobadas</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.warning}`}>{stats.pending}</div>
                <div className={`text-xs ${statColors.warning} font-medium`}>Pendientes</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.danger}`}>{stats.rejected}</div>
                <div className={`text-xs ${statColors.danger} font-medium`}>Rechazadas</div>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4">👥 Usuarios + Farmacias</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.primary}`}>{stats.superAdmins}</div>
                <div className={`text-xs ${statColors.primary} font-medium`}>Super Admin</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.warning}`}>{stats.admins}</div>
                <div className={`text-xs ${statColors.warning} font-medium`}>Admins</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.danger}`}>{stats.totalPharmacies}</div>
                <div className={`text-xs ${statColors.danger} font-medium`}>Farmacias</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.warning}`}>{stats.farmaceuticos}</div>
                <div className={`text-xs ${statColors.warning} font-medium`}>Farmacéuticos</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.danger}`}>{stats.domiciliario}</div>
                <div className={`text-xs ${statColors.danger} font-medium`}>Domiciliarios</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.success}`}>{stats.clientes}</div>
                <div className={`text-xs ${statColors.success} font-medium`}>Clientes</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.secondary}`}>{stats.totalUsers + stats.totalPharmacies}</div>
                <div className={`text-xs ${statColors.secondary} font-medium`}>Total</div>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4">📋 Pedidos por Estado</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.secondary}`}>{stats.totalPedidos}</div>
                <div className={`text-xs ${statColors.secondary} font-medium`}>Total</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.primary}`}>{stats.pedidosPendientes}</div>
                <div className={`text-xs ${statColors.primary} font-medium`}>Pendientes</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.danger}`}>{stats.pedidosEnCamino}</div>
                <div className={`text-xs ${statColors.danger} font-medium`}>En Camino</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.success}`}>{stats.pedidosEntregados}</div>
                <div className={`text-xs ${statColors.success} font-medium`}>Entregados</div>
              </div>
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.warning}`}>{stats.pedidosCancelados}</div>
                <div className={`text-xs ${statColors.warning} font-medium`}>Cancelados</div>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4">💊 Productos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={glassCard}>
                <div className={`text-2xl font-extrabold ${statColors.secondary}`}>{stats.totalProductos}</div>
                <div className={`text-xs ${statColors.secondary} font-medium`}>Total</div>
              </div>
            </div>
          </>
        )}

        {tab === "farmacias" && (
          <>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🏪 Solicitudes de Farmacias
              <button onClick={() => cargarDatos()} className="text-violet-500 text-sm hover:underline">🔄 Actualizar</button>
            </h2>
            {cargando ? (
              <div className="text-center py-12 text-slate-500">Cargando...</div>
            ) : pharmacies.length === 0 ? (
              <div className={`text-center py-12 text-slate-500 ${bgCard} rounded-xl`}>No hay solicitudes</div>
            ) : (
              <div className="space-y-3">
                {pharmacies.map(p => (
                  <div key={p.id} className={`${bgCard} rounded-xl p-5 shadow-sm`}>
                    <div className="flex justify-between items-start">
                      <div className="text-left">
                        <div className="font-bold text-lg">{p.nombre}</div>
                        <div className="text-slate-500 text-sm">NIT: {p.nit}</div>
                        <div className="text-slate-400 text-xs mt-1">📍 {p.direccion}, {p.barrio}, {p.ciudad}</div>
                        <div className="text-slate-400 text-xs">📞 {p.telefono} | 📧 {p.email}</div>
                        <div className="text-slate-400 text-xs">👤 Responsable: {p.responsable_nombre}</div>
                        <div className="text-slate-400 text-xs">📅 Solicitud: {fmtFecha(p.fecha_solicitud)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          p.estado === "aprobado" ? "bg-green-600 text-white" :
                          p.estado === "rechazado" ? "bg-red-600 text-white" :
                          "bg-yellow-600 text-white"
                        }`}>
                          {p.estado.toUpperCase()}
                        </span>
                        {p.estado === "pendiente" && (
                          <div className="flex gap-2 mt-2">
                            <button className="bg-red-500 text-white px-4 py-1 rounded-lg text-sm" onClick={() => setRechazoModal(p)}>❌ Rechazar</button>
                            <button className="bg-green-600 text-white px-4 py-1 rounded-lg text-sm" onClick={() => aprobarPharmacy(p.id)}>✅ Aprobar</button>
                          </div>
                        )}
                        {p.estado !== "pendiente" && (
                          <button className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm mt-2" onClick={() => eliminarPharmacy(p.id, p.nombre)}>🗑️ Eliminar</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "usuarios" && (
          <>
            <h2 className="text-lg sm:text-xl font-bold mt-6 sm:mt-8 mb-4">👥 Todos los Usuarios</h2>
            <div className="hidden sm:block">
              <div className={`${bgCard} rounded-xl p-4 shadow-sm overflow-x-auto`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="pb-2">Nombre</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Rol</th>
                      <th className="pb-2">Farmacia</th>
                      <th className="pb-2">Telefono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-2">{u.nombre || "-"}</td>
                        <td className="py-2">{u.email || "-"}</td>
                        <td className="py-2">
                          {editandoUsuario?.id === u.id ? (
                            <div className="flex gap-1">
                              <select
                                value={nuevoRol}
                                onChange={e => setNuevoRol(e.target.value)}
                                className="text-xs border rounded px-2 py-1 bg-white text-slate-800 font-semibold"
                              >
                                <option value="">Seleccionar</option>
                                <option value="cliente">Cliente</option>
                                <option value="admin">Admin</option>
                                <option value="farmaceutico">Farmaceutico</option>
                                <option value="domiciliario">Domiciliario</option>
                                <option value="superadmin">🌐 Super Admin</option>
                              </select>
                              <button onClick={() => cambiarRol(u.id)} className="text-green-600 font-bold text-sm ml-1">✓</button>
                              <button onClick={() => { setEditandoUsuario(null); setNuevoRol(""); }} className="text-red-600 font-bold text-sm ml-1">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditandoUsuario(u); setNuevoRol(u.rol || "cliente"); }}
                              className={`px-2 py-1 rounded text-xs cursor-pointer font-bold ${
                                u.rol === "superadmin" ? "bg-gradient-to-r from-purple-600 to-violet-700 text-white shadow-lg shadow-purple-500/30" :
                                u.rol === "admin" ? "bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-500/30" :
                                u.rol === "farmaceutico" ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30" :
                                u.rol === "domiciliario" ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30" :
                                "bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/30"
                              }`}
                            >
                              {u.rol === "superadmin" ? "🌐 Super Admin" : u.rol || "cliente"}
                            </button>
                          )}
                        </td>
                        <td className="py-2">{u.pharmacy_nombre || "-"}</td>
                        <td className="py-2">{u.telefono || "-"}</td>
                        <td className="py-2">
                          {u.rol !== "superadmin" && (
                            <button
                              onClick={() => eliminarUsuario(u.id)}
                              className="text-red-600 hover:text-red-800 font-bold text-sm"
                              title="Eliminar usuario"
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="sm:hidden space-y-3">
              {usuarios.map(u => (
                <div key={u.id} className={`${bgCard} rounded-xl p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-sm">{u.nombre || "-"}</div>
                      <div className="text-slate-500 text-xs">{u.email || "-"}</div>
                    </div>
                    {u.rol !== "superadmin" && (
                      <button onClick={() => eliminarUsuario(u.id)} className="text-red-600 font-bold text-lg">🗑️</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center mt-2">
                    {editandoUsuario?.id === u.id ? (
                      <div className="flex gap-1 flex-wrap">
                        <select value={nuevoRol} onChange={e => setNuevoRol(e.target.value)} className="text-xs border rounded px-2 py-2 bg-white text-slate-800 font-semibold min-h-[36px]">
                          <option value="cliente">Cliente</option>
                          <option value="admin">Admin</option>
                          <option value="farmaceutico">Farmaceutico</option>
                          <option value="domiciliario">Domiciliario</option>
                          <option value="superadmin">🌐 Super Admin</option>
                        </select>
                        <button onClick={() => cambiarRol(u.id)} className="text-green-600 font-bold text-sm px-2 py-2 min-h-[36px]">✓</button>
                        <button onClick={() => { setEditandoUsuario(null); setNuevoRol(""); }} className="text-red-600 font-bold text-sm px-2 py-2 min-h-[36px]">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditandoUsuario(u); setNuevoRol(u.rol || "cliente"); }}
                        className={`px-2 py-1.5 rounded text-xs font-bold ${
                          u.rol === "superadmin" ? "bg-gradient-to-r from-purple-600 to-violet-700 text-white" :
                          u.rol === "admin" ? "bg-gradient-to-r from-violet-600 to-violet-700 text-white" :
                          u.rol === "farmaceutico" ? "bg-gradient-to-r from-green-600 to-green-700 text-white" :
                          u.rol === "domiciliario" ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white" :
                          "bg-gradient-to-r from-slate-500 to-slate-600 text-white"
                        }`}>
                        {u.rol === "superadmin" ? "🌐 Super Admin" : u.rol || "cliente"}
                      </button>
                    )}
                    <span className="text-xs text-slate-400">{u.pharmacy_nombre || "-"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
