import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Toast, useToast } from "../common/Toast";
import { useTheme } from "../../App";

function fmtCOP(price: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(price);
}

function fmtFecha(date: string) {
  return new Date(date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

const ICONOS = ["💊", "💉", "🩹", "🧪", "💊", "💊", "💊", "💊", "💊", "💊", "💊", "💊"];

export default function PanelAdministrador({ cerrarSesion, seccion: seccionProp, setSeccion: setSeccionProp }: { cerrarSesion: () => void; seccion?: string; setSeccion?: (s: string) => void }) {
  const { modoOscuro } = useTheme();
  const bgMain = modoOscuro ? "min-h-screen bg-slate-950 text-white" : "min-h-screen bg-slate-50 text-slate-800";
  const bgCard = modoOscuro 
    ? "bg-slate-900 border-l-4 border-violet-500" 
    : "bg-white border-l-4 border-violet-400 shadow-md rounded-r-xl";
  const bgLight = modoOscuro ? "bg-slate-800" : "bg-slate-100";
  const bgInput = modoOscuro ? "bg-slate-700 border-violet-500/30" : "bg-white border-violet-300";
  const statColors = modoOscuro ? {
    primary: "text-violet-300",
    secondary: "text-violet-400",
  } : {
    primary: "text-violet-600",
    secondary: "text-violet-500",
  };
  const [seccionLocal, setSeccionLocal] = useState("stats");
  const seccion = seccionProp || seccionLocal;
  const setSeccion = setSeccionProp || setSeccionLocal;
  const [productos, setProductos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
const [form, setForm] = useState({ nombre: "", precio: "", categoria: "", stock: "", imagen: "💊", formula_medica: false });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const { toast, show, clear } = useToast();

  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    console.log("🔄 Cargando datos...");
    
    try {
      const { data: prods, error: errProds } = await supabase.from("productos").select("*");
      const { data: peds, error: errPeds } = await supabase.from("pedidos").select("*").limit(50);
      const { data: users, error: errUsers } = await supabase.from("profiles").select("*");
      
      console.log("📦 Productos:", prods?.length, errProds);
      console.log("📋 Pedidos:", peds?.length, errPeds);
      console.log("👥 Usuarios:", users?.length, errUsers);
      
      if (errProds || errPeds || errUsers) {
        setError(`Errores: productos: ${errProds?.message}, pedidos: ${errPeds?.message}, usuarios: ${errUsers?.message}`);
      }
      
      setProductos(prods || []);
      setPedidos(peds || []);
      setUsuarios(users || []);
    } catch (e: any) {
      console.error("❌ Error:", e);
      setError(e.message || "Error desconocido");
    }
    
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, []);

  const guardarProducto = async () => {
    if (!form.nombre || !form.precio) { show("Nombre y precio obligatorios", "error"); return; }
    const datos = { 
      nombre: form.nombre, 
      precio: Number(form.precio), 
      categoria: form.categoria, 
      stock: Number(form.stock) || 0, 
      imagen: form.imagen, 
      formula_medica: form.formula_medica 
    };
    if (editando) {
      await supabase.from("productos").update(datos).eq("id", editando);
      show("Producto actualizado");
    } else {
      await supabase.from("productos").insert(datos);
      show("Producto creado");
    }
    setForm({ nombre: "", precio: "", categoria: "", stock: "", imagen: "💊", formula_medica: false });
    setMostrarForm(false); setEditando(null);
    cargar();
  };

  const eliminar = async (id: string) => {
    if (!window.confirm("Eliminar este producto?")) return;
    await supabase.from("productos").delete().eq("id", id);
    show("Producto eliminado");
    cargar();
  };

  const iniciarEdicion = (p: any) => {
    setForm({ 
      nombre: p.nombre, 
      precio: p.precio, 
      categoria: p.categoria || "", 
      stock: p.stock, 
      imagen: p.imagen || "💊", 
      formula_medica: p.formula_medica || false
    });
    setEditando(p.id); setMostrarForm(true);
  };

  return (
    <div className={`min-h-screen font-sans ${bgMain}`}>
      <Toast msg={toast.msg} tipo={toast.tipo} onClose={clear} />
      
      <div className="max-w-5xl mx-auto p-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}
        {cargando ? (
          <div className="text-center py-12 text-slate-500">Cargando...</div>
        ) : (
          <>
            {seccion === "stats" && (
              <>
                <h1 className="text-2xl font-bold text-violet-600 mb-6">Dashboard</h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
                  <div className={`${bgCard} rounded-xl p-5 text-center shadow-sm`}>
                    <div className={`text-3xl font-extrabold ${statColors.primary}`}>{productos.length}</div>
                    <div className="text-slate-500 text-sm">Productos</div>
                  </div>
                  <div className={`${bgCard} rounded-xl p-5 text-center shadow-sm`}>
                    <div className={`text-3xl font-extrabold ${statColors.secondary}`}>{pedidos.length}</div>
                    <div className="text-slate-500 text-sm">Pedidos</div>
                  </div>
                  <div className={`${bgCard} rounded-xl p-5 text-center shadow-sm`}>
                    <div className={`text-3xl font-extrabold ${statColors.primary}`}>{pedidos.filter((p: any) => p.estado === "entregado").length}</div>
                    <div className="text-slate-500 text-sm">Entregados</div>
                  </div>
                  <div className={`${bgCard} rounded-xl p-5 text-center shadow-sm`}>
                    <div className={`text-3xl font-extrabold ${statColors.secondary}`}>{usuarios.filter((u: any) => u.rol === "cliente").length}</div>
                    <div className="text-slate-500 text-sm">Clientes</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className={`${bgCard} rounded-xl p-5 text-center shadow-sm`}>
                    <div className={`text-2xl font-extrabold ${statColors.primary}`}>{fmtCOP(pedidos.reduce((acc, p: any) => acc + (p.total || 0), 0))}</div>
                    <div className="text-slate-500 text-sm">Ingresos Total</div>
                  </div>
                  <div className={`${bgCard} rounded-xl p-5 text-center shadow-sm`}>
                    <div className={`text-2xl font-extrabold ${statColors.secondary}`}>{usuarios.filter((u: any) => u.rol === "farmaceutico").length}</div>
                    <div className="text-slate-500 text-sm">Farmacéuticos</div>
                  </div>
                  <div className={`${bgCard} rounded-xl p-5 text-center shadow-sm`}>
                    <div className={`text-2xl font-extrabold ${statColors.primary}`}>{usuarios.filter((u: any) => u.rol === "domiciliario").length}</div>
                    <div className="text-slate-500 text-sm">Domiciliarios</div>
                  </div>
                </div>
              </>
            )}

            {seccion === "productos" && (
              <>
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h1 className="text-2xl font-bold text-violet-600">Productos</h1>
                    <p className="text-slate-500 text-sm">{productos.length} productos</p>
                  </div>
                  <button 
                    className={`px-4 py-2 rounded-lg font-semibold ${mostrarForm ? "bg-red-600 hover:bg-red-700" : "bg-violet-600 hover:bg-violet-700"} text-white`}
                    onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm({ nombre: "", precio: "", categoria: "", stock: "", imagen: "💊", formula_medica: false }); }}>
                    {mostrarForm ? "Cancelar" : "+ Nuevo producto"}
                  </button>
                </div>

                {mostrarForm && (
                  <div className={`${bgCard} rounded-xl p-6 mb-6 shadow-sm`}>
                    <div className="font-bold text-lg mb-4">{editando ? "Editar producto" : "Nuevo producto"}</div>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        className={`px-4 py-3 border ${bgInput} rounded-lg`} 
                        placeholder="Nombre del producto" 
                        value={form.nombre} 
                        onChange={e => upd("nombre", e.target.value)} 
                      />
                      <input 
                        className={`px-4 py-3 border ${bgInput} rounded-lg`} 
                        placeholder="Precio" 
                        type="number" 
                        value={form.precio} 
                        onChange={e => upd("precio", e.target.value)} 
                      />
                      <input 
                        className={`px-4 py-3 border ${bgInput} rounded-lg`} 
                        placeholder="Categoría" 
                        value={form.categoria} 
                        onChange={e => upd("categoria", e.target.value)} 
                      />
                      <input 
                        className={`px-4 py-3 border ${bgInput} rounded-lg`} 
                        placeholder="Stock" 
                        type="number" 
                        value={form.stock} 
                        onChange={e => upd("stock", e.target.value)} 
                      />
                    </div>
                    
                    <div className="mt-4">
                      <label className="text-slate-500 text-sm block mb-2">Seleccionar icono</label>
                      <div className="flex flex-wrap gap-2">
                        {ICONOS.map((icono) => (
                          <button
                            key={icono}
                            type="button"
                            onClick={() => upd("imagen", icono)}
                            className={`w-12 h-12 rounded-lg text-2xl border-2 transition-all flex items-center justify-center ${
                              form.imagen === icono 
                                ? "border-violet-600 bg-blue-50" 
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {icono}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="formula_medica"
                        checked={form.formula_medica}
                        onChange={e => upd("formula_medica", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <label htmlFor="formula_medica" className="text-slate-700 font-medium">
                        🩺 Requires medical formula (receta médica)
                      </label>
                    </div>
                    
                    <button 
                      className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
                      onClick={guardarProducto}>
                      {editando ? "Guardar cambios" : "Crear producto"}
                    </button>
                  </div>
                )}

                {productos.map(p => (
                  <div key={p.id} className={`flex justify-between items-center p-4 ${bgCard} rounded-lg mb-2 shadow-sm`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{p.imagen}</span>
                      <div>
                        <div className="font-bold">{p.nombre}</div>
                        <div className="text-slate-500 text-sm">{p.categoria}</div>
                      </div>
                      {p.formula_medica && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">🩺 Fórmula</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-violet-600 font-bold">{fmtCOP(p.precio)}</span>
                      <span className={`px-3 py-1 rounded-lg text-sm ${p.stock > 10 ? "bg-green-100 text-green-700" : p.stock > 0 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        Stock: {p.stock}
                      </span>
                      <button 
                        className="px-3 py-1 border border-violet-600 text-violet-600 rounded-lg text-sm hover:bg-blue-50"
                        onClick={() => iniciarEdicion(p)}>
                        Editar
                      </button>
                      <button 
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                        onClick={() => eliminar(p.id)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {seccion === "pedidos" && (
              <>
                <h1 className="text-2xl font-bold text-violet-600 mb-6">Pedidos</h1>
                {pedidos.length === 0 ? (
                  <div className={`text-center py-12 text-slate-500 ${bgCard} rounded-xl`}>No hay pedidos</div>
                ) : (
                  pedidos.map(p => (
                    <div key={p.id} className={`flex justify-between items-center p-4 ${bgCard} rounded-lg mb-2 shadow-sm`}>
                      <div>
                        <div className="font-bold">Pedido #{p.id?.slice(-6)}</div>
                        <div className="text-slate-500 text-xs">
                          Cliente ID: {p.cliente_id?.slice(-8)} | {fmtFecha(p.created_at)}
                        </div>
                        {p.metodo_pago && (
                          <div className="text-slate-400 text-xs">Método: {p.metodo_pago}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-600">{fmtCOP(p.total)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          p.estado === "entregado" ? "bg-green-600 text-white" :
                          p.estado === "en_camino" ? "bg-violet-600 text-white" :
                          p.estado === "listo" ? "bg-purple-700 text-white" :
                          p.estado === "en_preparacion" ? "bg-orange-500 text-white" :
                          "bg-yellow-500 text-white"
                        }`}>
                          {p.estado}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {seccion === "usuarios" && (
              <>
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h1 className="text-2xl font-bold text-violet-600">Gestión de Usuarios</h1>
                    <p className="text-slate-500 text-sm">{usuarios.length} usuarios registrados</p>
                  </div>
                </div>

                <div className={`${bgCard} rounded-xl p-6 mb-6 shadow-sm`}>
                  <h2 className="font-bold text-lg mb-4">Asignar rol a usuario</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      id="usuario-select"
                      className={`px-4 py-3 border ${bgInput} rounded-lg`}
                      defaultValue=""
                    >
                      <option value="" disabled>Seleccionar usuario</option>
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id}>{u.nombre || u.email || u.id.slice(0,8)}</option>
                      ))}
                    </select>
                    <select
                      id="rol-select"
                      className={`px-4 py-3 border ${bgInput} rounded-lg`}
                      defaultValue=""
                    >
                      <option value="" disabled>Seleccionar rol</option>
                      <option value="cliente">Cliente</option>
                      <option value="farmaceutico">Farmacéutico</option>
                      <option value="domiciliario">Domiciliario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <button 
                    className="mt-4 bg-violet-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-violet-700"
                    onClick={async () => {
                      const usuarioSelect = document.getElementById("usuario-select") as HTMLSelectElement;
                      const rolSelect = document.getElementById("rol-select") as HTMLSelectElement;
                      const usuarioId = usuarioSelect.value;
                      const nuevoRol = rolSelect.value;
                      
                      if (!usuarioId || !nuevoRol) {
                        show("Selecciona usuario y rol", "error");
                        return;
                      }
                      
                      await supabase.from("profiles").update({ rol: nuevoRol }).eq("id", usuarioId);
                      show("Rol actualizado");
                      cargar();
                    }}
                  >
                    Asignar Rol
                  </button>
                </div>

                <div className={`${bgCard} rounded-xl p-4 shadow-sm`}>
                  <h3 className="font-bold mb-3">Lista de usuarios</h3>
                  <div className="space-y-2">
                    {usuarios.map(u => (
                      <div key={u.id} className={`flex justify-between items-center p-3 ${bgLight} rounded-lg`}>
                        <div>
                          <div className="font-medium">{u.nombre || u.email || "Sin nombre"}</div>
                          <div className="text-slate-500 text-xs">{u.email || "Sin email"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            u.rol === "admin" ? "bg-purple-700 text-white" :
                            u.rol === "farmaceutico" ? "bg-violet-600 text-white" :
                            u.rol === "domiciliario" ? "bg-green-600 text-white" :
                            "bg-slate-400 text-white"
                          }`}>
                            {u.rol || "cliente"}
                          </span>
                          <button
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700"
                            onClick={async () => {
                              if (!window.confirm(`¿Eliminar a ${u.nombre || u.email}?`)) return;
                              await supabase.from("profiles").delete().eq("id", u.id);
                              show("Usuario eliminado");
                              cargar();
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}