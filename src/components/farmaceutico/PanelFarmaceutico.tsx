import { useState, useEffect, useCallback } from "react";
import { supabase, estadoLabel } from "../../supabaseClient";
import { Toast, useToast } from "../common/Toast";
import { useTheme } from "../../App";

const COLORS = {
  fondo: "#f8fafc",
  blanco: "#ffffff",
  azul: "#2563eb",
  verde: "#16a34a",
  rojo: "#dc2626",
  amarillo: "#f59e0b",
  gris: "#64748b",
  oscuro: "#0f172a",
};

function fmtCOP(price: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(price);
}

function fmtFecha(date: string) {
  return new Date(date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PanelFarmaceutico({ perfil, cerrarSesion, seccion: seccionProp, setSeccion: setSeccionProp }: { perfil: any; cerrarSesion: () => void; seccion?: string; setSeccion?: (s: string) => void }) {
  const { modoOscuro } = useTheme();
  const bgMain = modoOscuro ? "min-h-screen bg-slate-950 text-white" : "min-h-screen bg-slate-50 text-slate-800";
  const bgCard = modoOscuro 
    ? "bg-slate-900 border-l-4 border-violet-500" 
    : "bg-white border-l-4 border-violet-400 shadow-md rounded-r-xl";
  const bgLight = modoOscuro ? "bg-slate-800" : "bg-slate-100";
  const bgInput = modoOscuro ? "bg-slate-700 border-violet-500/30" : "bg-white border-violet-300";
  const statColors = modoOscuro ? {
    primary: "text-violet-300",
    secondary: "text-violet-200",
  } : {
    primary: "text-violet-600",
    secondary: "text-violet-500",
  };
  const [seccionLocal, setSeccionLocal] = useState("formulas");
  const seccion = seccionProp || seccionLocal;
  const setSeccion = setSeccionProp || setSeccionLocal;
  const [formulas, setFormulas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pedidosCargando, setPedidosCargando] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [observacion, setObservacion] = useState("");
  const [formulaSeleccionada, setFormulaSeleccionada] = useState<any>(null);
  const { toast, show, clear } = useToast();
  const [editandoProducto, setEditandoProducto] = useState<any>(null);
  const [nuevoStock, setNuevoStock] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [busquedaInventario, setBusquedaInventario] = useState("");
  
  // Estados para venta presencial
  const [carritoPresencial, setCarritoPresencial] = useState<any[]>([]);
  const [busquedaPresencial, setBusquedaPresencial] = useState("");
  const [datosCliente, setDatosCliente] = useState({ nombre: "", email: "", telefono: "" });
  const [mostrarPago, setMostrarPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [infoPago, setInfoPago] = useState({ numeroTarjeta: "", nombreTitular: "", expiry: "", cvv: "" });

  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);

  const cargarFormulas = useCallback(() => {
    supabase.from("formulas")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }: any) => {
        setFormulas(data || []);
        setCargando(false);
      });
  }, []);

  const cargarProductos = useCallback(() => {
    if (!perfil?.pharmacy_id) return;
    supabase.from("productos").select("*").eq("pharmacy_id", perfil.pharmacy_id).order("nombre")
      .then(({ data }: any) => setProductos(data || []));
  }, [perfil?.pharmacy_id]);

  const recargarPedidos = useCallback(async () => {
    if (!perfil?.pharmacy_id) return;
    setPedidosCargando(true);
    const { data, error } = await supabase.from("pedidos")
      .select("*, pedido_productos(*, productos(nombre))")
      .eq("pharmacy_id", perfil.pharmacy_id)
      .in("estado", ["pendiente", "en_preparacion", "listo", "entregado"])
      .order("created_at", { ascending: false })
      .limit(500);
    console.log("Pedidos pharma:", data, "error:", error);
    setPedidos(data || []);
    setPedidosCargando(false);
  }, [perfil?.pharmacy_id]);
  
  const cargarPedidos = useCallback(() => {
    recargarPedidos();
  }, [recargarPedidos]);

  useEffect(() => { cargarFormulas(); }, [cargarFormulas]);
  useEffect(() => { cargarProductos(); }, [cargarProductos]);
  useEffect(() => { cargarPedidos(); }, [cargarPedidos]);

  useEffect(() => {
    const interval = setInterval(() => {
      cargarFormulas();
      cargarProductos();
      cargarPedidos();
    }, 5000);
    return () => clearInterval(interval);
  }, [cargarFormulas, cargarProductos, cargarPedidos]);

  const aprobarFormula = async (id: string) => {
    await supabase.from("formulas").update({ estado: "aprobado", observacion: observacion || "Aprobado" }).eq("id", id);
    show("Fórmula aprobada");
    cargarFormulas();
    setFormulaSeleccionada(null);
    setObservacion("");
  };

  const rechazarFormula = async (id: string) => {
    await supabase.from("formulas").update({ estado: "rechazado", observacion: observacion || "Rechazada" }).eq("id", id);
    show("Fórmula rechazada");
    cargarFormulas();
    setFormulaSeleccionada(null);
    setObservacion("");
  };

  const guardarProducto = async () => {
    if (!editandoProducto) return;
    const updates: any = {};
    if (nuevoStock !== "") updates.stock = parseInt(nuevoStock);
    if (nuevoPrecio !== "") updates.precio = parseFloat(nuevoPrecio);
    
    if (Object.keys(updates).length > 0) {
      await supabase.from("productos").update(updates).eq("id", editandoProducto.id);
      show("Producto actualizado");
      cargarProductos();
    }
    setEditandoProducto(null);
    setNuevoStock("");
    setNuevoPrecio("");
  };

  const iniciarPreparacion = async (pedidoId: string) => {
    await supabase.from("pedidos").update({ estado: "en_preparacion" }).eq("id", pedidoId);
    show("Preparación iniciada");
    cargarPedidos();
  };

  const marcarListo = async (pedidoId: string) => {
    await supabase.from("pedidos").update({ estado: "listo" }).eq("id", pedidoId);
    show("Pedido listo para entrega");
    cargarPedidos();
  };

  const formulasPendientes = formulas.filter(f => f.estado === "pendiente");
  const formulasProcesadas = formulas.filter(f => f.estado !== "pendiente");
  const productosConFormula = productos.filter(p => p.formula_medica);
  
  const pedidosPendientes = pedidos.filter(p => p.estado === "pendiente");
  const pedidosEnPreparacion = pedidos.filter(p => p.estado === "en_preparacion");
  const pedidosListos = pedidos.filter(p => p.estado === "listo");
  const pedidosEnCamino = pedidos.filter(p => p.estado === "en_camino");
  const pedidosEntregados = pedidos.filter(p => p.estado === "entregado");

  const getProductoNombre = (productoId: string) => {
    const prod = productos.find(p => p.id === productoId);
    return prod?.nombre || "Producto #" + productoId?.slice(-6);
  };

  return (
    <div className={`min-h-screen font-sans ${bgMain}`}>
      <Toast msg={toast.msg} tipo={toast.tipo} onClose={clear} />
      
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {seccion === "formulas" && (
          <>
            <h1 className="text-xl sm:text-2xl font-bold text-violet-600 mb-1">Fórmulas Médicas</h1>
            <p className="text-slate-500 mb-4 sm:mb-6 text-sm">{formulasPendientes.length} pendientes de revisión</p>
            
            {cargando ? (
              <div className="text-center py-12 text-slate-500">Cargando...</div>
            ) : formulasPendientes.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No hay fórmulas</div>
            ) : (
              formulasPendientes.map(f => (
                <div key={f.id} className={`${bgCard} rounded-xl p-5 mb-3 border-l-4 border-violet-500`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-bold text-lg text-violet-600">{getProductoNombre(f.producto_id)}</div>
                      <div className="text-slate-500 text-xs">Enviado: {fmtFecha(f.created_at)}</div>
                      <div className="mt-3 p-3 bg-slate-100 rounded-lg">
                        <a href={f.foto_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 font-semibold text-sm">
                          📷 VER FÓRMULA MÉDICA
                        </a>
                      </div>
                    </div>
                    <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold">Pendiente</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700"
                      onClick={() => setFormulaSeleccionada({ ...f, action: "rechazar" })}>
                      Rechazar
                    </button>
                    <button 
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700"
                      onClick={() => setFormulaSeleccionada({ ...f, action: "aprobar" })}>
                      Aprobar
                    </button>
                  </div>
                </div>
              ))
            )}

            {formulasProcesadas.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Historial</h2>
                {formulasProcesadas.map(f => (
                  <div key={f.id} className={`${bgCard} rounded-xl p-4 mb-3 border-l-4 ${f.estado === "aprobado" ? "border-green-500" : "border-red-500"}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">{getProductoNombre(f.producto_id)}</div>
                        <div className="text-slate-500 text-xs">{fmtFecha(f.created_at)}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        f.estado === "aprobado" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                      }`}>
                        {f.estado === "aprobado" ? "✅ Aprobado" : "❌ Rechazado"}
                      </span>
                    </div>
                    {f.observacion && (
                      <div className={`mt-2 text-sm p-2 rounded ${f.estado === "aprobado" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        💬 {f.observacion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {seccion === "inventario" && (
          <>
            <h1 className="text-xl sm:text-2xl font-bold text-violet-600 mb-4 sm:mb-6">Inventario</h1>
            <div className={`flex items-center gap-3 mb-4 px-3 py-2 ${modoOscuro ? "bg-slate-800" : "bg-white"} rounded-lg border ${modoOscuro ? "border-slate-700" : "border-slate-200"}`}>
              <span className="text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={busquedaInventario}
                onChange={(e) => setBusquedaInventario(e.target.value)}
                className={`flex-1 bg-transparent outline-none text-sm ${modoOscuro ? "text-white placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}`}
              />
              {busquedaInventario && (
                <button onClick={() => setBusquedaInventario("")} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <div className="font-bold text-red-600 mb-3">Con Receta ({productosConFormula.filter(p => p.nombre.toLowerCase().includes(busquedaInventario.toLowerCase())).length})</div>
                {productosConFormula.filter(p => p.nombre.toLowerCase().includes(busquedaInventario.toLowerCase())).map(p => (
                  <div key={p.id} className={`${bgCard} rounded-lg p-3 mb-2 shadow-sm`}>
                    <div className="font-semibold flex justify-between items-center">
                      <span>{p.nombre}</span>
                      <button 
                        className="text-slate-500 hover:text-slate-700 text-lg"
                        onClick={() => { setEditandoProducto(p); setNuevoStock(p.stock.toString()); setNuevoPrecio(p.precio.toString()); }}>
                        ✏️
                      </button>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={p.stock < 10 ? "text-red-600" : "text-violet-600"}>Stock: {p.stock}</span>
                      <span className="text-violet-600 font-bold">{fmtCOP(p.precio)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div className="font-bold text-violet-600 mb-3">Venta Libre ({productos.filter(p => !p.formula_medica).filter(p => p.nombre.toLowerCase().includes(busquedaInventario.toLowerCase())).length})</div>
                {productos.filter(p => !p.formula_medica).filter(p => p.nombre.toLowerCase().includes(busquedaInventario.toLowerCase())).map(p => (
                  <div key={p.id} className={`${bgCard} rounded-lg p-3 mb-2 shadow-sm`}>
                    <div className="font-semibold flex justify-between items-center">
                      <span>{p.nombre}</span>
                      <button 
                        className="text-slate-500 hover:text-slate-700 text-lg"
                        onClick={() => { setEditandoProducto(p); setNuevoStock(p.stock.toString()); setNuevoPrecio(p.precio.toString()); }}>
                        ✏️
                      </button>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={p.stock < 10 ? "text-red-600" : "text-violet-600"}>Stock: {p.stock}</span>
                      <span className="text-violet-600 font-bold">{fmtCOP(p.precio)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {seccion === "pedidos" && (
          <>
            <h1 className="text-xl sm:text-2xl font-bold text-violet-600 mb-4 sm:mb-6">Pedidos</h1>
            <div className={`text-sm mb-4 px-3 py-2 rounded-lg ${modoOscuro ? "bg-slate-800 text-slate-400" : "bg-violet-50 text-violet-600"}`}>
              Haz clic en un pedido para ver los productos que debe preparar. Cuando el pedido esté completamente preparado, actualiza el estado a "Listo".
            </div>
            
            {pedidos.length === 0 ? (
              <div className={`text-center py-12 text-slate-500 ${bgCard} rounded-xl`}>No hay pedidos</div>
            ) : (
              <>
                {pedidosEnPreparacion.length > 0 && (
                  <div className="mb-6">
                    <div className="font-bold text-yellow-600 mb-3">🔄 En preparación ({pedidosEnPreparacion.length})</div>
                    {pedidosEnPreparacion.map(p => (
                      <div key={p.id} onClick={() => setPedidoSeleccionado(p)} className={`${bgCard} rounded-xl p-4 mb-3 border-l-4 border-yellow-500 cursor-pointer hover:shadow-lg transition-all`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold">Pedido #{p.id?.slice(-6)}</div>
                            <div className="text-slate-500 text-xs">{fmtFecha(p.created_at)}</div>
                          </div>
                          <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold">En preparación</span>
                        </div>
                        <div className="text-slate-400 text-xs mt-2">Clic para ver productos</div>
                      </div>
                    ))}
                  </div>
                )}

                {pedidosListos.length > 0 && (
                  <div className="mb-6">
                    <div className="font-bold text-violet-600 mb-3">📦 Listos para entrega ({pedidosListos.length})</div>
                    {pedidosListos.map(p => (
                      <div key={p.id} onClick={() => setPedidoSeleccionado(p)} className={`${bgCard} rounded-xl p-4 mb-3 border-l-4 border-green-500 cursor-pointer hover:shadow-lg transition-all`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold">Pedido #{p.id?.slice(-6)}</div>
                            <div className="text-slate-500 text-xs">{fmtFecha(p.created_at)}</div>
                          </div>
                          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">Listo</span>
                        </div>
                        <div className="text-slate-400 text-xs mt-2">Clic para ver productos</div>
                      </div>
                    ))}
                  </div>
                )}

                {pedidosEnCamino.length > 0 && (
                  <div className="mb-6">
                    <div className="font-bold text-violet-600 mb-3">🚴 En camino ({pedidosEnCamino.length})</div>
                    {pedidosEnCamino.map(p => (
                      <div key={p.id} onClick={() => setPedidoSeleccionado(p)} className={`${bgCard} rounded-xl p-4 mb-3 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-all`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold">Pedido #{p.id?.slice(-6)}</div>
                            <div className="text-slate-500 text-xs">{fmtFecha(p.created_at)}</div>
                          </div>
                          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">🚴 En camino</span>
                        </div>
                        <div className="text-slate-400 text-xs mt-2">Clic para ver productos</div>
                      </div>
                    ))}
                  </div>
                )}

                {pedidosEntregados.length > 0 && (
                  <div className="mb-6">
                    <div className="font-bold text-violet-600 mb-3">✅ Entregados ({pedidosEntregados.length})</div>
                    {pedidosEntregados.map(p => (
                      <div key={p.id} onClick={() => setPedidoSeleccionado(p)} className={`${bgCard} rounded-xl p-4 mb-3 shadow-sm border-l-4 border-green-500 cursor-pointer hover:shadow-lg transition-all`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold">Pedido #{p.id?.slice(-6)}</div>
                            <div className="text-slate-500 text-xs">{fmtFecha(p.created_at)}</div>
                          </div>
                          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">{p.tipo_venta === "presencial" ? "💰 Presencial" : "Entregado"}</span>
                        </div>
                        <div className="text-slate-400 text-xs mt-2">Clic para ver productos</div>
                      </div>
                    ))}
                  </div>
                )}

                {pedidosPendientes.length > 0 && (
                  <div className="mb-6">
                    <div className="font-bold text-violet-600 mb-3">🆕 Nuevos ({pedidosPendientes.length})</div>
                    {pedidosPendientes.map(p => (
                      <div key={p.id} onClick={() => setPedidoSeleccionado(p)} className={`${bgCard} rounded-xl p-4 mb-3 shadow-sm border-l-4 border-violet-500 cursor-pointer hover:shadow-lg transition-all`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold">Pedido #{p.id?.slice(-6)}</div>
                            <div className="text-slate-500 text-xs">{fmtFecha(p.created_at)}</div>
                          </div>
                          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">Nuevo</span>
                        </div>
                        <div className="text-slate-400 text-xs mt-2">Clic para ver productos</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {pedidoSeleccionado && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPedidoSeleccionado(null)}>
                <div className={`${bgCard} rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide`} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-violet-600">Pedido #{pedidoSeleccionado.id?.slice(-6)}</h2>
                    <button onClick={() => setPedidoSeleccionado(null)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${modoOscuro ? "bg-slate-700 hover:bg-slate-600 text-slate-500" : "bg-slate-100 hover:bg-slate-200 text-slate-500"}`}>✕</button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Estado</span><span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${estadoLabel[pedidoSeleccionado.estado] || "bg-slate-500"}`}>{estadoLabel[pedidoSeleccionado.estado] || pedidoSeleccionado.estado}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Fecha</span><span className="font-bold">{fmtFecha(pedidoSeleccionado.created_at)}</span></div>
                    {pedidoSeleccionado.codigo_verificacion && (
                      <div className={`text-center py-3 rounded-xl ${modoOscuro ? "bg-violet-900/40" : "bg-violet-100"}`}>
                        <div className={`text-xs font-semibold ${modoOscuro ? "text-violet-300" : "text-violet-600"}`}>Código de entrega</div>
                        <div className={`text-3xl font-bold ${modoOscuro ? "text-violet-300" : "text-violet-700"}`}>{pedidoSeleccionado.codigo_verificacion}</div>
                      </div>
                    )}
                  </div>

                  <div className={`border-t pt-3 mb-4 ${modoOscuro ? "border-slate-600" : "border-slate-200"}`}>
                    <div className="font-bold text-sm mb-2">Productos a preparar</div>
                    {pedidoSeleccionado.pedido_productos?.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm py-1.5">
                        <span>{item.productos?.nombre}</span>
                        <span className="font-bold">x{item.cantidad}</span>
                      </div>
                    ))}
                  </div>

                  <div className={`border-t pt-3 ${modoOscuro ? "border-slate-600" : "border-slate-200"}`}>
                    <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-violet-600">{fmtCOP(pedidoSeleccionado.total)}</span></div>
                  </div>

                  {(pedidoSeleccionado.estado === "pendiente" || pedidoSeleccionado.estado === "en_preparacion") && (
                    <button
                      className={`w-full mt-4 py-3 rounded-xl font-bold text-white transition-all ${pedidoSeleccionado.estado === "pendiente" ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-600 hover:bg-green-700"}`}
                      onClick={() => {
                        if (pedidoSeleccionado.estado === "pendiente") {
                          supabase.from("pedidos").update({ estado: "en_preparacion" }).eq("id", pedidoSeleccionado.id).then(() => {
                            show("Preparación iniciada");
                            cargarPedidos();
                            setPedidoSeleccionado(null);
                          });
                        } else {
                          supabase.from("pedidos").update({ estado: "listo" }).eq("id", pedidoSeleccionado.id).then(() => {
                            show("Pedido marcado como listo!");
                            cargarPedidos();
                            setPedidoSeleccionado(null);
                          });
                        }
                      }}
                    >
                      {pedidoSeleccionado.estado === "pendiente" ? "🔄 Iniciar preparación" : "✅ Marcar como listo"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {seccion === "presencial" && (
        <VentaPresencial 
          productos={productos} 
          bgCard={bgCard} 
          bgLight={bgLight} 
          bgInput={bgInput} 
          perfil={perfil}
          recargarPedidos={recargarPedidos}
          modoOscuro={modoOscuro}
        />
      )}

      {seccion === "historial" && (
        <>
          <div className="max-w-5xl mx-auto p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-violet-600 mb-4 sm:mb-6">📊 Historial</h1>
          
            {pedidos.length === 0 ? (
              <div className={`text-center py-12 text-slate-500 ${bgCard} rounded-xl`}>No hay pedidos</div>
            ) : (
              <>
                {pedidos.filter(p => p.estado === "entregado").length > 0 && (
                  <div className="mb-6">
                    <div className="font-bold text-green-600 mb-3 flex items-center gap-2">✅ Entregados ({pedidos.filter(p => p.estado === "entregado").length})</div>
                    <div className="space-y-3">
                      {pedidos.filter(p => p.estado === "entregado").map(p => (
                        <div key={p.id} className={`${bgCard} rounded-2xl p-4 border-l-4 border-green-500 hover:shadow-lg transition-all duration-300`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-lg">Pedido #{p.id?.slice(-6)}</div>
                              <div className="text-slate-500 text-sm">{fmtFecha(p.created_at)}</div>
                              <div className="text-xs text-slate-400 mt-1">{p.cliente_nombre || "Cliente"} · {p.cliente_telefono || "Sin teléfono"}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">{p.tipo_venta === "presencial" ? "💰 Presencial" : "Entregado"}</span>
                              <span className="text-xs text-slate-400">{p.metodo_pago}</span>
                            </div>
                          </div>
                          <div className={`${bgLight} rounded-xl p-3 mt-3`}>
                            {p.pedido_productos?.map((item: any, idx: number) => (
                              <div key={idx} className="text-sm text-slate-600 flex justify-between"><span>{item.cantidad}x {item.productos?.nombre}</span><span className="font-semibold text-violet-600">{fmtCOP(item.precio_unitario * item.cantidad)}</span></div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                            <span className="text-sm text-slate-500">Total</span>
                            <span className="font-bold text-xl text-violet-600">{fmtCOP(p.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              
                {pedidos.filter(p => p.estado === "cancelado").length > 0 && (
                  <div className="mb-6">
                    <div className="font-bold text-red-600 mb-3 flex items-center gap-2">❌ Cancelados ({pedidos.filter(p => p.estado === "cancelado").length})</div>
                    <div className="space-y-3">
                      {pedidos.filter(p => p.estado === "cancelado").map(p => (
                        <div key={p.id} className={`${bgCard} rounded-2xl p-4 border-l-4 border-red-500 hover:shadow-lg transition-all duration-300`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-lg">Pedido #{p.id?.slice(-6)}</div>
                              <div className="text-slate-500 text-sm">{fmtFecha(p.created_at)}</div>
                            </div>
                            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">Cancelado</span>
                          </div>
                          <div className={`${bgLight} rounded-xl p-3 mt-3`}>
                            {p.pedido_productos?.map((item: any, idx: number) => (
                              <div key={idx} className="text-sm text-slate-600 flex justify-between"><span>{item.cantidad}x {item.productos?.nombre}</span><span className="font-semibold text-violet-600">{fmtCOP(item.precio_unitario * item.cantidad)}</span></div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                            <span className="text-sm text-slate-500">Total</span>
                            <span className="font-bold text-xl text-slate-400 line-through">{fmtCOP(p.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {formulaSeleccionada && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className={`${bgCard} p-5 sm:p-8 rounded-t-3xl sm:rounded-2xl max-w-sm w-full`}>
            <div className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
              {formulaSeleccionada.action === "aprobar" ? "APROBAR" : "RECHAZAR"} FÓRMULA
            </div>
            <div className="font-semibold mb-4">{getProductoNombre(formulaSeleccionada.producto_id)}</div>
            <textarea 
              placeholder="Observación" 
              value={observacion} 
              onChange={e => setObservacion(e.target.value)}
              className={`w-full p-3 border ${bgInput} rounded-lg h-20 resize-none mb-4`}
            />
            <div className="flex gap-2">
              <button 
                className="flex-1 bg-slate-500 text-white py-2 sm:py-3 rounded-lg font-semibold min-h-[44px]"
                onClick={() => { setFormulaSeleccionada(null); setObservacion(""); }}>
                Cancelar
              </button>
              <button 
                className={`flex-1 py-2 sm:py-3 rounded-lg font-semibold text-white min-h-[44px] ${
                  formulaSeleccionada.action === "aprobar" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
                onClick={() => formulaSeleccionada.action === "aprobar" ? aprobarFormula(formulaSeleccionada.id) : rechazarFormula(formulaSeleccionada.id)}>
                {formulaSeleccionada.action === "aprobar" ? "APROBAR" : "RECHAZAR"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {editandoProducto && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className={`${bgCard} p-5 sm:p-8 rounded-t-3xl sm:rounded-2xl max-w-sm w-full`}>
            <div className="text-lg sm:text-xl font-bold mb-4">Editar Producto</div>
            <div className="font-semibold mb-4">{editandoProducto.nombre}</div>
            <div className="mb-3">
              <label className="text-xs text-slate-500 block mb-1">Stock</label>
              <input 
                type="number" 
                value={nuevoStock} 
                onChange={e => setNuevoStock(e.target.value)} 
                className={`w-full p-3 border ${bgInput} rounded-lg`}
              />
            </div>
            <div className="mb-4">
              <label className="text-xs text-slate-500 block mb-1">Precio</label>
              <input 
                type="number" 
                value={nuevoPrecio} 
                onChange={e => setNuevoPrecio(e.target.value)} 
                className={`w-full p-3 border ${bgInput} rounded-lg`}
              />
            </div>
            <div className="flex gap-2">
              <button 
                className="flex-1 bg-slate-500 text-white py-2 sm:py-3 rounded-lg font-semibold min-h-[44px]"
                onClick={() => { setEditandoProducto(null); setNuevoStock(""); setNuevoPrecio(""); }}>
                Cancelar
              </button>
              <button 
                className="flex-1 bg-purple-700 text-white py-2 sm:py-3 rounded-lg font-semibold hover:bg-gray-600 min-h-[44px]"
                onClick={guardarProducto}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Component for presencial sales
function VentaPresencial({ productos, bgCard, bgLight, bgInput, perfil, recargarPedidos, modoOscuro }: any) {
  const [carrito, setCarrito] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [datosCliente, setDatosCliente] = useState({ nombre: "", email: "", telefono: "" });
  const [mostrarPago, setMostrarPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [infoPago, setInfoPago] = useState({ numeroTarjeta: "", nombreTitular: "", expiry: "", cvv: "" });
  const [mostrarDatos, setMostrarDatos] = useState(false);
  const { toast, show, clear } = useToast();

  const agregarCarrito = (producto: any) => {
    if (producto.stock <= 0) { show("Sin stock", "error"); return; }
    setCarrito(prev => {
      const ex = prev.find(p => p.id === producto.id);
      if (ex) {
        if (ex.cantidad >= producto.stock) { show("No hay más stock", "warn"); return prev; }
        return prev.map(p => p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id: number, delta: number) => {
    setCarrito(prev => {
      const item = prev.find(p => p.id === id);
      if (!item) return prev;
      const nuevaCantidad = item.cantidad + delta;
      if (nuevaCantidad <= 0) {
        return prev.filter(p => p.id !== id);
      }
      if (nuevaCantidad > item.stock) { show("No hay más stock", "warn"); return prev; }
      return prev.map(p => p.id === id ? { ...p, cantidad: nuevaCantidad } : p);
    });
  };

  const subtotal = carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);

  const validarTarjeta = (numero: string): boolean => {
    const limpiar = numero.replace(/\s/g, "");
    if (!/^\d+$/.test(limpiar)) return false;
    if (limpiar.length < 13 || limpiar.length > 19) return false;
    let suma = 0, alternar = false;
    for (let i = limpiar.length - 1; i >= 0; i--) {
      let digito = parseInt(limpiar[i]);
      if (alternar) { digito *= 2; if (digito > 9) digito -= 9; }
      suma += digito;
      alternar = !alternar;
    }
    return suma % 10 === 0;
  };

  const validarExpiry = (expiry: string): boolean => {
    const match = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) return false;
    const mes = parseInt(match[1]);
    const anio = parseInt("20" + match[2]);
    return new Date(anio, mes - 1) > new Date();
  };

  const procesarVenta = async () => {
    if (!datosCliente.nombre || !datosCliente.telefono) {
      show("Nombre y teléfono son obligatorios", "error");
      return;
    }

    if (metodoPago === "tarjeta") {
      if (!infoPago.numeroTarjeta || !infoPago.nombreTitular || !infoPago.expiry || !infoPago.cvv) {
        show("Completa todos los datos de la tarjeta", "error");
        return;
      }
      if (!validarTarjeta(infoPago.numeroTarjeta)) {
        show("Número de tarjeta inválido", "error");
        return;
      }
      if (!validarExpiry(infoPago.expiry)) {
        show("Fecha de expiración inválida o tarjeta vencida", "error");
        return;
      }
      if (!/^\d{3,4}$/.test(infoPago.cvv)) {
        show("CVV inválido", "error");
        return;
      }
    }

    setProcesando(true);
    await new Promise(r => setTimeout(r, 1500));

    for (const item of carrito) {
      const { data: prodActual } = await supabase.from("productos").select("stock").eq("id", item.id).single();
      if (!prodActual || prodActual.stock < item.cantidad) {
        show(`Stock insuficiente de ${item.nombre}. Disponible: ${prodActual?.stock || 0}`, "error");
        setProcesando(false);
        return;
      }
    }

    console.log("perfil del farmaceutico:", perfil);
    console.log("pharmacy_id:", perfil?.pharmacy_id);
    console.log("Creando pedido con pharmacy_id:", perfil?.pharmacy_id);
    console.log("Datos del pedido:", {
      pharmacy_id: perfil.pharmacy_id,
      estado: "entregado",
      total: subtotal,
      costo_domicilio: 0,
      entregado: true,
      metodo_pago: metodoPago,
      cliente_nombre: datosCliente.nombre,
      cliente_telefono: datosCliente.telefono,
      cliente_email: datosCliente.email || null,
      tipo_venta: "presencial"
    });

    // Create pedido
    const { data: pedido, error } = await supabase.from("pedidos").insert({
      pharmacy_id: perfil.pharmacy_id,
      estado: "entregado", // Ya se entrega en el momento
      total: subtotal,
      costo_domicilio: 0,
      entregado: true,
      metodo_pago: metodoPago,
      cliente_nombre: datosCliente.nombre,
      cliente_telefono: datosCliente.telefono,
      cliente_email: datosCliente.email || null,
      tipo_venta: "presencial"
    }).select().single();
    
    console.log("Pedido creado:", pedido, "Error:", error);
    if (error) {
      console.error("Error creando pedido:", error);
    }

    if (pedido) {
      // Create pedido productos
      const items = carrito.map(i => ({ pedido_id: pedido.id, producto_id: i.id, cantidad: i.cantidad, precio_unitario: i.precio }));
      await supabase.from("pedido_productos").insert(items);

      // Create factura
      await supabase.from("facturas").insert({ pedido_id: pedido.id, total: subtotal, fecha: new Date().toISOString() });

      // Update stock
      for (const item of carrito) {
        await supabase.from("productos").update({ stock: item.stock - item.cantidad }).eq("id", item.id);
      }
    }

    setCarrito([]);
    setDatosCliente({ nombre: "", email: "", telefono: "" });
    setMostrarPago(false);
    setMetodoPago("");
    setInfoPago({ numeroTarjeta: "", nombreTitular: "", expiry: "", cvv: "" });
    setProcesando(false);
    show("¡Venta realizada con éxito!");
    
    // Recargar pedidos
    if (recargarPedidos) recargarPedidos();
  };

  const productosFiltrados = productos.filter((p: any) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const totalCarrito = carrito.reduce((a, i) => a + i.cantidad, 0);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-violet-600">💰 Venta Presencial</h1>
          <p className="text-slate-500 text-sm">Venta directa en mostrador</p>
        </div>
        {carrito.length > 0 && (
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="bg-violet-600 text-white px-3 sm:px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-violet-600/30">
              {totalCarrito} productos
            </div>
            <span className="text-base sm:text-lg font-bold text-violet-600">{fmtCOP(subtotal)}</span>
            <button 
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold hover:from-green-400 hover:to-green-500 shadow-lg shadow-green-500/40 hover:shadow-green-500/60 transition-all duration-300 hover:scale-[1.02] min-h-[44px]"
              onClick={() => setMostrarDatos(true)}
            >
              Cobrar
            </button>
          </div>
        )}
      </div>

      {carrito.length > 0 && (
        <div className={`${bgCard} rounded-2xl p-4 mb-6`}>
          <h2 className="font-bold text-violet-600 mb-3">🛒 Carrito de venta</h2>
          <div className="space-y-2">
            {carrito.map(item => (
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="font-medium text-slate-700">{item.nombre}</span>
                  <span className="text-slate-400 text-sm ml-2">x{item.cantidad}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-violet-600">{fmtCOP(item.precio * item.cantidad)}</span>
                  <div className="flex gap-1 bg-violet-100 rounded-full px-2 py-1">
                    <button className="w-7 h-7 rounded-full bg-white shadow text-lg font-bold text-slate-600 hover:bg-red-500 hover:text-white transition-all" onClick={() => cambiarCantidad(item.id, -1)}>-</button>
                    <span className="w-8 text-center font-bold text-violet-600">{item.cantidad}</span>
                    <button className={`w-7 h-7 rounded-full shadow text-lg font-bold text-slate-600 transition-all ${item.cantidad >= item.stock ? "opacity-40 cursor-not-allowed bg-slate-200" : "bg-white shadow hover:bg-violet-500 hover:text-white"}`} disabled={item.cantidad >= item.stock} onClick={() => cambiarCantidad(item.id, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input 
        placeholder="Buscar producto..." 
        value={busqueda} 
        onChange={e => setBusqueda(e.target.value)} 
        className={`w-full px-4 py-3 rounded-xl border mb-5 ${bgInput} focus:outline-none focus:ring-2 focus:ring-violet-500`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {productosFiltrados.map((p: any) => {
          const enCarrito = carrito.find(c => c.id === p.id);
          return (
            <div key={p.id} className={`${bgCard} rounded-2xl p-4 flex flex-col items-center gap-3 hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-300 hover:scale-[1.02]`}>
              <div className="text-4xl">{p.imagen || "💊"}</div>
              <div className="font-bold text-sm text-center text-slate-700">{p.nombre}</div>
              <div className={`text-xs ${p.stock <= 5 ? "text-red-500" : "text-slate-400"}`}>Stock: {p.stock}</div>
              <div className="text-violet-600 font-bold text-xl">{fmtCOP(p.precio)}</div>
              {p.stock <= 0 ? (
                <button disabled className="w-full py-2.5 bg-slate-200 text-slate-400 rounded-xl font-semibold cursor-not-allowed">Sin stock</button>
              ) : enCarrito ? (
                <div className="flex gap-2 w-full">
                  <button className="flex-1 bg-violet-600 text-white py-2 rounded-xl font-bold hover:bg-violet-500 transition-all active:scale-95" onClick={() => cambiarCantidad(p.id, -1)}>-</button>
                  <span className="flex items-center justify-center font-bold text-violet-600 w-12">{enCarrito.cantidad}</span>
                  <button className="flex-1 bg-violet-600 text-white py-2 rounded-xl font-bold hover:bg-violet-500 transition-all active:scale-95" onClick={() => cambiarCantidad(p.id, 1)}>+</button>
                </div>
              ) : (
                <button className="w-full bg-gradient-to-r from-violet-500 to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] transition-all duration-300" onClick={() => agregarCarrito(p)}>
                  + Agregar
                </button>
              )}
              {enCarrito && enCarrito.cantidad > 0 && (
                <button className="w-full bg-gradient-to-r from-violet-500 to-violet-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-600/60 hover:scale-[1.02] transition-all duration-300" onClick={() => setMostrarDatos(true)}>
                  🛒 Ir al carrito
                </button>
              )}
            </div>
          );
        })}
      </div>

      {mostrarDatos && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className={`${bgCard} rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200/50 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-violet-600 to-violet-800 bg-clip-text text-transparent">Datos del Cliente</h2>
              <button onClick={() => setMostrarDatos(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all duration-300 hover:rotate-90">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Nombre completo *</label>
                <input
                  placeholder="Nombre del cliente"
                  value={datosCliente.nombre}
                  onChange={e => setDatosCliente(d => ({ ...d, nombre: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-base"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Teléfono *</label>
                <input
                  placeholder="Teléfono del cliente"
                  value={datosCliente.telefono}
                  onChange={e => setDatosCliente(d => ({ ...d, telefono: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-base"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Email (opcional)</label>
                <input
                  placeholder="Email del cliente"
                  value={datosCliente.email}
                  onChange={e => setDatosCliente(d => ({ ...d, email: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-base"
                />
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 hover:scale-[1.02] min-h-[48px]" onClick={() => setMostrarDatos(false)}>
                Cancelar
              </button>
              <button className="flex-1 bg-gradient-to-r from-violet-500 to-violet-600 text-white py-3 sm:py-4 rounded-xl font-bold hover:from-violet-400 hover:to-violet-500 shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 transition-all duration-300 hover:scale-[1.02] min-h-[48px]" onClick={() => { setMostrarDatos(false); setMostrarPago(true); }}>
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarPago && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className={`${bgCard} rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200/50 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-violet-800 bg-clip-text text-transparent">Método de Pago</h2>
                <p className="text-slate-400 text-sm mt-1">Total: <span className="font-bold text-violet-600">{fmtCOP(subtotal)}</span></p>
              </div>
              <button onClick={() => setMostrarPago(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all duration-300 hover:rotate-90">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setMetodoPago("efectivo")}
                className={`w-full p-4 rounded-2xl text-left flex items-center gap-4 transition-all duration-300 ${
                  metodoPago === "efectivo" ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-xl shadow-violet-500/40 scale-[1.02]" : "bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 hover:border-violet-300"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${metodoPago === "efectivo" ? "bg-white/20" : "bg-yellow-100"}`}>
                  <span className="text-2xl">💵</span>
                </div>
                <span className={`font-bold text-lg ${metodoPago === "efectivo" ? "text-white" : "text-slate-700"}`}>Efectivo</span>
                {metodoPago === "efectivo" && (
                  <div className="ml-auto w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  </div>
                )}
              </button>
              <button
                onClick={() => setMetodoPago("tarjeta")}
                className={`w-full p-4 rounded-2xl text-left flex items-center gap-4 transition-all duration-300 ${
                  metodoPago === "tarjeta" ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-xl shadow-violet-500/40 scale-[1.02]" : "bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 hover:border-violet-300"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${metodoPago === "tarjeta" ? "bg-white/20" : "bg-violet-100"}`}>
                  <span className="text-2xl">💳</span>
                </div>
                <span className={`font-bold text-lg ${metodoPago === "tarjeta" ? "text-white" : "text-slate-700"}`}>Tarjeta</span>
                {metodoPago === "tarjeta" && (
                  <div className="ml-auto w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                  </div>
                )}
              </button>
            </div>

            {metodoPago === "tarjeta" && (
              <div className="space-y-4 mb-6 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700">
                <div className="relative">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Número de tarjeta</label>
                  <input
                    placeholder="1234 5678 9012 3456"
                    value={infoPago.numeroTarjeta}
                    onChange={e => setInfoPago(d => ({ ...d, numeroTarjeta: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Nombre del titular</label>
                  <input
                    placeholder="Como aparece en la tarjeta"
                    value={infoPago.nombreTitular}
                    onChange={e => setInfoPago(d => ({ ...d, nombreTitular: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Vencimiento</label>
                    <input
                      placeholder="MM/AA"
                      value={infoPago.expiry}
                      onChange={e => setInfoPago(d => ({ ...d, expiry: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">CVV</label>
                    <input
                      placeholder="•••"
                      type="password"
                      value={infoPago.cvv}
                      onChange={e => setInfoPago(d => ({ ...d, cvv: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {metodoPago === "efectivo" && (
              <div className="mb-6 p-5 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-yellow-200 dark:bg-yellow-700 flex items-center justify-center text-3xl">💵</div>
                  <div>
                    <div className="text-yellow-800 dark:text-yellow-300 font-bold text-lg">Pago en efectivo</div>
                    <div className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">El cliente paga al recibir los productos.</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-bold transition-all duration-300 hover:scale-[1.02]" onClick={() => setMostrarPago(false)}>
                Cancelar
              </button>
              <button 
                className={`flex-1 text-white py-4 rounded-xl font-bold transition-all duration-300 ${procesando ? "bg-slate-400" : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 shadow-xl shadow-green-500/40 hover:shadow-green-500/60 hover:scale-[1.02]"}`}
                onClick={procesarVenta}
                disabled={procesando || !metodoPago}
              >
                {procesando ? "Procesando..." : "Confirmar Venta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}