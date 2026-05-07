import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Toast, useToast } from "../common/Toast";
import { useTheme } from "../../App";

function fmtCOP(price: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(price);
}

function fmtFecha(date: string) {
  return new Date(date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TIEMPOS = [5, 10, 15, 20, 30, 45, 60];

export default function PanelDomiciliario({ perfil, cerrarSesion }: { perfil: any; cerrarSesion: () => void }) {
  const { modoOscuro } = useTheme();
  const bgMain = modoOscuro ? "min-h-screen bg-slate-950 text-white" : "min-h-screen bg-slate-50 text-slate-800";
  const bgNav = modoOscuro ? "bg-slate-900 text-white" : "bg-white text-slate-800";
  const bgCard = modoOscuro 
    ? "bg-slate-900 border-l-4 border-violet-500" 
    : "bg-white border-l-4 border-violet-400 shadow-md rounded-r-xl";
  const bgLight = modoOscuro ? "bg-slate-800" : "bg-slate-100";
  const bgInput = modoOscuro ? "bg-slate-800 border-violet-500/30 text-white" : "bg-white border-violet-300";
  const [disponibles, setDisponibles] = useState<any[]>([]);
  const [misServicios, setMisServicios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const { toast, show, clear } = useToast();
  const [tiempoEntrega, setTiempoEntrega] = useState<Record<string, number>>({});
  const [codigoModal, setCodigoModal] = useState<any>(null);
  const [codigoInput, setCodigoInput] = useState("");
  const [tiempoModal, setTiempoModal] = useState<any>(null);
  const [tiempoSeleccionado, setTiempoSeleccionado] = useState(15);
  const [tiemposInicio, setTiemposInicio] = useState<Record<string, number>>({});
  const [tiemposEstimados, setTiemposEstimados] = useState<Record<string, number>>({});
  const [mensajeModal, setMensajeModal] = useState<any>(null);
  const [mensajeTexto, setMensajeTexto] = useState("");
  const [tabActiva, setTabActiva] = useState("disponibles");
  const [filtroFecha, setFiltroFecha] = useState("");

  const cargar = useCallback(async () => {
    const [{ data: disp }, { data: mis }] = await Promise.all([
      supabase.from("pedidos")
        .select("*, pedido_productos(*, productos(nombre)), pharmacies(nombre)")
        .eq("estado", "listo")
        .is("domiciliario_id", null)
        .limit(20),
      supabase.from("pedidos")
        .select("*, pedido_productos(*, productos(nombre)), pharmacies(nombre)")
        .eq("domiciliario_id", perfil.id)
        .in("estado", ["en_camino", "entregado"])
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const enriquecerPedidos = async (peds: any[]) => {
      if (!peds) return [];
      return Promise.all(
        peds.map(async (p) => {
          let clienteNombre = p.cliente_nombre;
          let direccionEntrega = p.direccion_entrega;
          if ((!clienteNombre || !direccionEntrega) && p.cliente_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("nombre, direccion")
              .eq("id", p.cliente_id)
              .single();
            clienteNombre = clienteNombre || profile?.nombre || "Cliente";
            direccionEntrega = direccionEntrega || profile?.direccion || "";
          }
          return { ...p, cliente_nombre: clienteNombre || "Cliente", direccion_entrega: direccionEntrega || "No registrada", farmacia_nombre: p.pharmacies?.nombre || "Farmacia" };
        })
      );
    };

    setDisponibles(await enriquecerPedidos(disp || []));
    const enriquecidos = await enriquecerPedidos(mis || []);
    setMisServicios(enriquecidos);

    const inicios: Record<string, number> = {};
    const estimados: Record<string, number> = {};
    enriquecidos.filter(p => p.estado === "en_camino").forEach(p => {
      const tiempoMin = p.tiempo_estimado || 15;
      estimados[p.id] = tiempoMin;
      if (tiemposInicio[p.id]) {
        inicios[p.id] = tiemposInicio[p.id];
      } else {
        const now = Date.now();
        const tiempoMs = now - (tiempoMin * 60000);
        inicios[p.id] = tiempoMs;
      }
    });
    setTiemposInicio(inicios);
    setTiemposEstimados(estimados);

    setCargando(false);
  }, [perfil.id]);

  useEffect(() => { cargar(); }, [cargar]);
  
  useEffect(() => {
    const subscription = supabase
      .channel('pedidos-changes-domiciliario')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `domiciliario_id=eq.${perfil.id}` },
        (payload) => {
          console.log('Cambio en pedido:', payload);
          cargar();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [perfil.id]);
  useEffect(() => {
    const interval = setInterval(() => {
      setTiemposInicio(prev => {
        const next = { ...prev };
        const updated: Record<string, number> = {};
        for (const id in next) {
          const elapsedMin = (Date.now() - next[id]) / 60000;
          const estMin = tiemposEstimados[id] || 15;
          const progreso = Math.min(100, (elapsedMin / estMin) * 100);
          updated[id] = progreso;
        }
        setTiempoEntrega(updated);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tiemposEstimados]);
  useEffect(() => {
    const interval = setInterval(() => {
      cargar();
    }, 3000);
    return () => clearInterval(interval);
  }, [cargar]);

  const iniciarEntrega = async (pedido: any) => {
    const tiempoEst = pedido.tiempo_estimado || 15;
    await supabase.from("pedidos").update({ 
      domiciliario_id: perfil.id, 
      estado: "en_camino",
      tiempo_estimado: tiempoEst
    }).eq("id", pedido.id);
    setTiemposInicio(prev => ({ ...prev, [pedido.id]: Date.now() }));
    setTiemposEstimados(prev => ({ ...prev, [pedido.id]: tiempoEst }));
    show("Entrega iniciada!");
    cargar();
  };

  const entregar = async () => {
    if (!codigoModal) return;
    if (codigoInput !== codigoModal.codigo_verificacion) {
      show("Codigo incorrecto", "error");
      return;
    }
    await supabase.from("pedidos").update({ estado: "entregado" }).eq("id", codigoModal.id);
    show("Pedido entregado!");
    setCodigoModal(null);
    setCodigoInput("");
    setTiemposInicio(prev => {
      const next = { ...prev };
      delete next[codigoModal.id];
      return next;
    });
    setTiemposEstimados(prev => {
      const next = { ...prev };
      delete next[codigoModal.id];
      return next;
    });
    cargar();
  };

  const guardarTiempo = async () => {
    if (!tiempoModal) return;
    await supabase.from("pedidos").update({ tiempo_estimado: tiempoSeleccionado }).eq("id", tiempoModal.id);
    setTiemposInicio(prev => ({ ...prev, [tiempoModal.id]: Date.now() }));
    setTiemposEstimados(prev => ({ ...prev, [tiempoModal.id]: tiempoSeleccionado }));
    show(`Tiempo estimado: ${tiempoSeleccionado} minutos`);
    setTiempoModal(null);
  };

  const enviarMensaje = async () => {
    if (!mensajeModal || !mensajeTexto.trim()) {
      show("Escribe un mensaje", "error");
      return;
    }
    await supabase.from("pedidos").update({ mensaje_domiciliario: mensajeTexto }).eq("id", mensajeModal.id);
    show("Mensaje enviado al cliente!");
    setMensajeModal(null);
    setMensajeTexto("");
    cargar();
  };

  const getBarraProgreso = (pedidoId: string, tiempoEst: number) => {
    const progreso = tiempoEntrega[pedidoId] || 0;
    const elapsedMin = tiemposInicio[pedidoId] ? (Date.now() - tiemposInicio[pedidoId]) / 60000 : 0;
    const tiempoRestante = Math.max(0, tiempoEst - elapsedMin);
    return (
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Llega en ~{Math.ceil(tiempoRestante)} min</span>
          <span>{Math.round(progreso)}%</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-1000 ${progreso >= 80 ? "bg-green-500" : progreso >= 50 ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${Math.min(progreso, 100)}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-sans ${bgMain}`}>
      <Toast msg={toast.msg} tipo={toast.tipo} onClose={clear} />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 mt-4">
        <div className="flex gap-2 mb-4 sm:mb-6 border-b border-slate-700">
          <button
            onClick={() => setTabActiva("disponibles")}
            className={`px-4 py-2 font-semibold text-sm sm:text-base border-b-2 min-h-[44px] ${
              tabActiva === "disponibles"
                ? "border-violet-500 text-violet-600"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}>
            Pedidos Disponibles
          </button>
          <button
            onClick={() => setTabActiva("mis-entregas")}
            className={`px-4 py-2 font-semibold text-sm sm:text-base border-b-2 min-h-[44px] ${
              tabActiva === "mis-entregas"
                ? "border-violet-500 text-violet-600"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}>
            Mis Entregas
          </button>
        </div>

        {tabActiva === "disponibles" && (
          <>
            <h1 className="text-xl sm:text-2xl font-bold text-violet-600 mb-4 sm:mb-6">Pedidos listos para entrega</h1>
            
            {cargando ? (
              <div className="text-center py-12 text-slate-500">Cargando...</div>
            ) : disponibles.length === 0 ? (
              <div className={`text-center py-12 text-slate-500 ${bgCard} rounded-xl p-8`}>No hay pedidos disponibles</div>
            ) : (
              <div>
                {disponibles.map(p => (
                  <div key={p.id} className={`${bgCard} rounded-xl p-4 sm:p-5 mb-4 shadow-sm border-2 border-green-400`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                      <div>
                        <div className="font-bold text-base sm:text-lg">Pedido #{p.id?.slice(-6)}</div>
                        {p.codigo_verificacion && (
                          <div className="text-xs text-violet-500 font-semibold mt-1">Código: {p.codigo_verificacion}</div>
                        )}
                      </div>
                      <div className="font-bold text-violet-600 text-base sm:text-lg">{fmtCOP(p.total)}</div>
                    </div>
                    
                    <div className={`space-y-1 mb-3 text-sm ${modoOscuro ? "text-slate-300" : "text-slate-700"}`}>
                      <div><span className="font-semibold">👤 Cliente:</span> {p.cliente_nombre || "N/A"}</div>
                      <div><span className="font-semibold">📍 Dirección:</span> {p.direccion_entrega || "No registrada"}</div>
                      <div><span className="font-semibold">🏪 Farmacia:</span> {p.farmacia_nombre || "Farmacia"}</div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <button 
                        className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-green-700 min-h-[44px]"
                        onClick={() => iniciarEntrega(p)}>
                        Iniciar Entrega
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tabActiva === "mis-entregas" && (
          <>
            <h1 className="text-xl sm:text-2xl font-bold text-violet-600 mb-4">Mis Entregas</h1>
            <p className={`text-sm mb-4 ${modoOscuro ? "text-slate-400" : "text-slate-600"}`}>
              Verás todas las entregas que has realizado con: fecha, cliente, dirección y estado.
            </p>
            
            <div className="mb-4 flex flex-col sm:flex-row gap-2">
              <label className={`text-sm ${modoOscuro ? "text-slate-300" : "text-slate-700"}`}>
                Filtrar por fecha:
              </label>
              <input
                type="date"
                value={filtroFecha}
                onChange={e => setFiltroFecha(e.target.value)}
                className={`px-3 py-2 rounded-lg border text-sm ${bgInput}`}
              />
              {filtroFecha && (
                <button
                  onClick={() => setFiltroFecha("")}
                  className="text-sm text-red-500 hover:text-red-400 min-h-[36px]">
                  Limpiar filtro
                </button>
              )}
            </div>

            <p className={`text-xs mb-4 italic ${modoOscuro ? "text-slate-500" : "text-slate-400"}`}>
              Puedes filtrar por fecha para ver entregas de un período específico.
            </p>

            {cargando ? (
              <div className="text-center py-12 text-slate-500">Cargando...</div>
            ) : misServicios.length === 0 ? (
              <div className={`text-center py-12 text-slate-500 ${bgCard} rounded-xl p-8`}>No hay entregas registradas</div>
            ) : (
              <div>
                {misServicios
                  .filter(p => {
                    if (!filtroFecha) return true;
                    const fechaPedido = new Date(p.created_at).toISOString().split("T")[0];
                    return fechaPedido === filtroFecha;
                  })
                  .map(p => (
                  <div key={p.id} className={`${bgCard} rounded-xl p-4 sm:p-5 mb-4 shadow-sm`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                      <div>
                        <div className="font-bold text-base sm:text-lg">Pedido #{p.id?.slice(-6)}</div>
                        <div className="text-xs text-slate-500">{fmtFecha(p.created_at)}</div>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                        p.estado === "entregado" ? "bg-green-500 text-white" : "bg-blue-500 text-white"
                      }`}>
                        {p.estado === "entregado" ? "Entregado" : "En camino"}
                      </span>
                    </div>
                    
                    <div className={`space-y-1 mb-3 text-sm ${modoOscuro ? "text-slate-300" : "text-slate-700"}`}>
                      <div><span className="font-semibold">👤 Cliente:</span> {p.cliente_nombre || "N/A"}</div>
                      <div><span className="font-semibold">📍 Dirección:</span> {p.direccion_entrega || "No registrada"}</div>
                      <div><span className="font-semibold">🏪 Farmacia:</span> {p.farmacia_nombre || "Farmacia"}</div>
                      <div><span className="font-semibold">💰 Total:</span> {fmtCOP(p.total)}</div>
                    </div>

                    {p.estado === "en_camino" && (
                      <>
                        {p.mensaje_domiciliario && (
                          <div className="mb-2 p-2 bg-blue-100 rounded-lg text-sm text-violet-700">
                            {p.mensaje_domiciliario}
                          </div>
                        )}
                        
                        {getBarraProgreso(p.id, p.tiempo_estimado || 15)}
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button 
                            className="bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 min-h-[40px]"
                            onClick={() => setTiempoModal(p)}>
                            Tiempo
                          </button>
                          <button 
                            className="bg-cyan-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-cyan-600 min-h-[40px]"
                            onClick={() => setMensajeModal(p)}>
                            Mensaje
                          </button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
                          <div className="font-bold text-violet-600 text-base sm:text-lg">{fmtCOP(p.total)}</div>
                          <button 
                            className="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold hover:bg-green-700 min-h-[44px]"
                            onClick={() => setCodigoModal(p)}>
                            Entregado
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {codigoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className={`${bgCard} rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-sm w-full text-center`}>
            <h2 className="text-lg sm:text-xl font-bold mb-4">Confirmar Entrega</h2>
            <p className="text-slate-500 mb-4 text-sm">Ingresa el codigo que te dio el cliente:</p>
            <input 
              type="text"
              maxLength={4}
              value={codigoInput}
              onChange={e => setCodigoInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full text-center text-2xl sm:text-3xl font-bold border-2 border-green-500 rounded-xl py-3 mb-4"
              placeholder="****"
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                className="flex-1 bg-slate-500 text-white py-2 sm:py-3 rounded-lg font-semibold min-h-[44px]"
                onClick={() => { setCodigoModal(null); setCodigoInput(""); }}>
                Cancelar
              </button>
              <button 
                className="flex-1 bg-green-600 text-white py-2 sm:py-3 rounded-lg font-bold min-h-[44px]"
                onClick={entregar}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {tiempoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className={`${bgCard} rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-sm w-full text-center`}>
            <h2 className="text-lg sm:text-xl font-bold mb-4">Tiempo de Entrega</h2>
            <p className="text-slate-500 mb-4 text-sm">En cuantOS minutos llegas?</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {TIEMPOS.map(t => (
                <button
                  key={t}
                  onClick={() => setTiempoSeleccionado(t)}
                  className={`py-3 rounded-lg font-bold text-lg min-h-[44px] ${
                    tiempoSeleccionado === t 
                      ? "bg-green-600 text-white" 
                      : modoOscuro ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button 
                className="flex-1 bg-slate-500 text-white py-2 sm:py-3 rounded-lg font-semibold min-h-[44px]"
                onClick={() => setTiempoModal(null)}>
                Cancelar
              </button>
              <button 
                className="flex-1 bg-green-600 text-white py-2 sm:py-3 rounded-lg font-bold min-h-[44px]"
                onClick={guardarTiempo}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {mensajeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className={`${bgCard} rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-sm w-full text-center`}>
            <h2 className="text-lg sm:text-xl font-bold mb-4">Enviar Mensaje</h2>
            <p className="text-slate-500 mb-4 text-sm">El cliente lo vera en su app:</p>
            <textarea
              value={mensajeTexto}
              onChange={e => setMensajeTexto(e.target.value)}
              placeholder="Ej: Estoy cerca, voy en camino..."
              className={`w-full px-4 py-3 rounded-lg border ${bgInput} h-24 mb-4 text-base`}
              maxLength={200}
            />
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {["Ya llego!", "Llegando en 5 min", "Estas cerca?", "Estoy en el edificio"].map(m => (
                <button
                  key={m}
                  onClick={() => setMensajeTexto(m)}
                  className="text-xs bg-slate-600 px-2 py-1 rounded min-h-[36px]"
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button 
                className="flex-1 bg-slate-500 text-white py-2 sm:py-3 rounded-lg font-semibold min-h-[44px]"
                onClick={() => { setMensajeModal(null); setMensajeTexto(""); }}>
                Cancelar
              </button>
              <button 
                className="flex-1 bg-cyan-600 text-white py-2 sm:py-3 rounded-lg font-bold min-h-[44px]"
                onClick={enviarMensaje}>
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}