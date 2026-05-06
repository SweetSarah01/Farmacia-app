import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Toast, useToast } from "../common/Toast";
import { useTheme } from "../../App";
import { estadoLabel } from "../../supabaseClient";

function fmtCOP(price: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(price);
}

function fmtFecha(date: string) {
  return new Date(date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminPharmacyPanel({ perfil, cerrarSesion, seccion, setSeccion }: any) {
  const { modoOscuro } = useTheme();
  const bgMain = modoOscuro ? "min-h-screen bg-slate-950 text-white" : "min-h-screen bg-slate-50 text-slate-800";
  const bgCard = modoOscuro 
    ? "bg-slate-900 border-l-4 border-violet-500" 
    : "bg-white border-l-4 border-violet-400 shadow-md rounded-r-xl";
  const bgLight = modoOscuro ? "bg-slate-800" : "bg-violet-100";
  const bgInput = modoOscuro ? "bg-slate-800 border-violet-500/30 text-white" : "bg-white border-violet-300";
  const statColors = modoOscuro ? {
    primary: "text-violet-300",
    secondary: "text-violet-200",
  } : {
    primary: "text-violet-600",
    secondary: "text-violet-500",
  };
  const btnPrimary = "bg-violet-600 text-white hover:bg-violet-700";
  const btnSuccess = "bg-green-600 text-white hover:bg-green-700";
  const btnDanger = "bg-red-600 text-white hover:bg-red-700";
  const btnSecondary = "bg-slate-600 text-white hover:bg-slate-500";
  
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({ nombre: "", precio: "", categoria: "", stock: "", imagen: "💊", formula_medica: false });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [nuevoStock, setNuevoStock] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const { toast, show, clear } = useToast();
  
  // Editar pharmacy
  const [editandoPharmacy, setEditandoPharmacy] = useState(false);
  const [formPharmacy, setFormPharmacy] = useState({ nombre: "", direccion: "", telefono: "", email: "", barrio: "", ciudad: "", horario: "", imagen_url: "" });
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<File | null>(null);
  
  // Gestion de usuarios
  const [usuariosFarmacia, setUsuariosFarmacia] = useState<any[]>([]);
  const [todosUsuarios, setTodosUsuarios] = useState<any[]>([]);
  const [busquedaUsuario, setBusquedaUsuario] = useState("");
  const [mostrarCrearUsuario, setMostrarCrearUsuario] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({ email: "", nombre: "", telefono: "", rol: "domiciliario" });
  const [rolesSeleccionados, setRolesSeleccionados] = useState<Record<string, string>>({} as Record<string, string>);
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);

  const crearUsuario = async (userId?: string, rol?: string) => {
    if (!userId) {
      show("Selecciona un usuario de la lista", "error");
      return;
    }
    if (!perfil?.pharmacy_id) {
      show("No tienes una pharmacy asignada", "error");
      return;
    }
    
    const rolAsignar = rol || "domiciliario";
    console.log("Agregando usuario:", userId, "como", rolAsignar, "a pharmacy:", perfil.pharmacy_id);
    
    setCreandoUsuario(true);
    
    try {
      // Verificar si el usuario ya tiene otra pharmacy
      const { data: usuarioExistente } = await supabase
        .from("profiles")
        .select("pharmacy_id, rol")
        .eq("id", userId)
        .single();
      
      if (usuarioExistente?.pharmacy_id && usuarioExistente.pharmacy_id !== perfil.pharmacy_id) {
        show("Este usuario ya pertenece a otra pharmacy", "error");
        setCreandoUsuario(false);
        return;
      }
      
      // Asignar a la pharmacy con el rol
      const { data, error } = await supabase.from("profiles").update({
        rol: rolAsignar,
        pharmacy_id: perfil.pharmacy_id
      }).eq("id", userId).select();
      
      console.log("Resultado:", data, error);
      
      if (error) {
        console.error("Error:", error);
        show("Error: " + error.message, "error");
      } else {
        const roleLabels: Record<string, string> = {
          admin: "Admin",
          farmaceutico: "Farmacéutico",
          domiciliario: "Repartidor"
        };
        show(`✓ Usuario asignado como ${roleLabels[rolAsignar] || rolAsignar}!`);
        cargarDatos();
      }
    } catch (err: any) {
      console.error("Excepcion:", err);
      show("Error: " + err.message, "error");
    }
    setCreandoUsuario(false);
    setMostrarCrearUsuario(false);
    setBusquedaUsuario("");
    setRolesSeleccionados({});
  };

  const cambiarRolUsuario = async (userId: string, nuevoRol: string) => {
    await supabase.from("profiles").update({ rol: nuevoRol }).eq("id", userId);
    show("✓ Rol actualizado");
    cargarDatos();
  };

  const desvincularUsuario = async (userId: string) => {
    if (!confirm("¿Quitar este usuario de tu pharmacy?")) return;
    await supabase.from("profiles").update({ pharmacy_id: null, rol: "cliente" }).eq("id", userId);
    show("✓ Usuario desvinculado");
    cargarDatos();
  };

  useEffect(() => {
    cargarDatos();
  }, [perfil?.pharmacy_id]);

  // Auto-refresh pedidos cada 3s
  useEffect(() => {
    const interval = setInterval(() => {
      if (!perfil?.pharmacy_id) return;
      cargarPedidos();
    }, 3000);
    return () => clearInterval(interval);
  }, [perfil?.pharmacy_id]);

  const cargarDatos = async () => {
    if (!perfil?.pharmacy_id) {
      setCargando(false);
      return;
    }
    setCargando(true);
    
    // Cargar pharmacy
    const { data: ph } = await supabase.from("pharmacies").select("*").eq("id", perfil.pharmacy_id).single();
    setPharmacy(ph);
    setFormPharmacy({
      nombre: ph?.nombre || "",
      direccion: ph?.direccion || "",
      telefono: ph?.telefono || "",
      email: ph?.email || "",
      barrio: ph?.barrio || "",
      ciudad: ph?.ciudad || "",
      horario: ph?.horario || "",
      imagen_url: ph?.imagen_url || ""
    });
    
    // Cargar productos de esta pharmacy
    const { data: prods } = await supabase.from("productos").select("*").eq("pharmacy_id", perfil.pharmacy_id).order("nombre");
    setProductos(prods || []);
    
    // Cargar pedidos de esta pharmacy
    await cargarPedidos();
    
    // Cargar usuarios de esta pharmacy
    console.log("Cargando usuarios con pharmacy_id:", perfil.pharmacy_id);
    const { data: users } = await supabase.from("profiles").select("*").eq("pharmacy_id", perfil.pharmacy_id);
    console.log("UsuariosFarmacia cargados:", users);
    setUsuariosFarmacia(users || []);
    
    // Cargar todos los usuarios disponibles
    const { data: allUsers } = await supabase.from("profiles").select("id, email, nombre, rol, pharmacy_id").order("nombre");
    console.log("Todos usuarios:", allUsers);
    setTodosUsuarios(allUsers || []);
    
    setCargando(false);
  };

  const cargarPedidos = async () => {
    if (!perfil?.pharmacy_id) return;
    const { data: peds } = await supabase.from("pedidos").select("*, pedido_productos(*, productos(nombre))").eq("pharmacy_id", perfil.pharmacy_id).order("created_at", { ascending: false });
    setPedidos(peds || []);
  };

  const guardarProducto = async () => {
    if (!form.nombre || !form.precio) { show("Nombre y precio obligatorios", "error"); return; }
    const datos = { 
      nombre: form.nombre, 
      precio: Number(form.precio), 
      categoria: form.categoria, 
      stock: Number(form.stock) || 0, 
      imagen: form.imagen, 
      formula_medica: form.formula_medica,
      pharmacy_id: perfil.pharmacy_id
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
    cargarDatos();
  };

  const eliminar = async (id: string) => {
    if (!window.confirm("Eliminar este producto?")) return;
    await supabase.from("productos").delete().eq("id", id);
    show("Producto eliminado");
    cargarDatos();
  };

  const iniciarEdicion = (p: any) => {
    setForm({ 
      nombre: p.nombre, 
      precio: p.precio?.toString() || "", 
      categoria: p.categoria || "", 
      stock: p.stock?.toString() || "", 
      imagen: p.imagen || "💊", 
      formula_medica: p.formula_medica || false
    });
    setEditando(p.id); setMostrarForm(true);
  };

  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const updPharmacy = (k: string, v: any) => setFormPharmacy(f => ({ ...f, [k]: v }));

  const guardarPharmacy = async () => {
    console.log("💾 Guardando pharmacy:", formPharmacy);
    console.log("📋 pharmacy_id:", perfil.pharmacy_id);
    
    if (!formPharmacy.nombre) { show("El nombre es obligatorio", "error"); return; }
    if (!formPharmacy.direccion) { show("La dirección es obligatoria", "error"); return; }
    if (!formPharmacy.telefono) { show("El teléfono es obligatorio", "error"); return; }
    
    try {
      const updates: any = {
        nombre: formPharmacy.nombre,
        direccion: formPharmacy.direccion,
        telefono: formPharmacy.telefono,
        barrio: formPharmacy.barrio || "",
        ciudad: formPharmacy.ciudad || "",
        horario: formPharmacy.horario || "",
      };
      
      if (formPharmacy.imagen_url) {
        updates.imagen_url = formPharmacy.imagen_url;
      }
      
      console.log("📝 Updates:", updates);
      
      const { error } = await supabase.from("pharmacies").update(updates).eq("id", perfil.pharmacy_id);
      
      if (error) {
        console.error("❌ Error guardando:", error);
        show("Error: " + error.message, "error");
        return;
      }
      
      show("✓ Farmacia actualizada!");
      cargarDatos();
    } catch (err: any) {
      console.error("❌ Excepción:", err);
      show("Error: " + err.message, "error");
    }
  };

  const subirImagenPharmacy = async () => {
    console.log("📸 Subiendo imagen:", imagenSeleccionada);
    
    if (!imagenSeleccionada) { 
      show("Selecciona una imagen", "error"); 
      return; 
    }
    
    setSubiendoImagen(true);
    
    try {
      const fileExt = imagenSeleccionada.name.split(".").pop();
      const fileName = `pharmacies/${perfil.pharmacy_id}/${Date.now()}.${fileExt}`;
      
      console.log("📤 Subiendo a:", fileName);
      
      const { error } = await supabase.storage.from("pharmacies").upload(fileName, imagenSeleccionada, {
        cacheControl: "3600",
        upsert: true
      });
      
      if (error) {
        console.error("❌ Error storage:", error);
        show("Error al subir: " + error.message, "error");
        setSubiendoImagen(false);
        return;
      }
      
      const { data: urlData } = supabase.storage.from("pharmacies").getPublicUrl(fileName);
      console.log("🔗 URL:", urlData.publicUrl);
      updPharmacy("imagen_url", urlData.publicUrl);
      setImagenSeleccionada(null);
      setSubiendoImagen(false);
      show("✓ Imagen subida!");
    } catch (err: any) {
      console.error("❌ Excepción:", err);
      show("Error: " + err.message, "error");
      setSubiendoImagen(false);
    }
  };

  const productosConFormula = productos.filter(p => p.formula_medica);
  const productosVentaLibre = productos.filter(p => !p.formula_medica);
  const productosTotal = productos.length;
  const pedidosCount = pedidos.length;
  const ingresosTotal = pedidos.reduce((acc, p) => acc + (p.total || 0), 0);

  if (!perfil?.pharmacy_id) {
    return (
      <div className={`min-h-screen font-sans ${bgMain} flex items-center justify-center`}>
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🏪</div>
          <h2 className="text-xl font-bold mb-2">No tienes una farmacia asignada</h2>
          <p className="text-slate-500">Contacta al administrador del sistema</p>
        </div>
      </div>
    );
  }

if (cargando) {
    return <div className={`min-h-screen font-sans ${bgMain} flex items-center justify-center`}>Cargando...</div>;
  }

  const renderContenido = () => {
    if (seccion === "mi-farmacia" || seccion === "") {
      return (
        <>
          <h2 className="text-lg sm:text-xl font-bold mb-4">🏪 Editar Mi Farmacia</h2>
          <div className={`${bgCard} rounded-xl p-4 sm:p-6 mb-4`}>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Logo de la Farmacia</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-3xl sm:text-4xl overflow-hidden">
                  {formPharmacy.imagen_url ? (
                    <img src={formPharmacy.imagen_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : "🏪"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input type="file" id="pharmacy-img-input" accept="image/*" className="hidden" onChange={(e) => setImagenSeleccionada(e.target.files?.[0] || null)} />
                  <label htmlFor="pharmacy-img-input" className={`inline-block px-4 py-2 rounded-lg cursor-pointer ${btnPrimary} min-h-[40px]`}>
                    {imagenSeleccionada ? imagenSeleccionada.name : (subiendoImagen ? "Subiendo..." : "Elegir")}
                  </label>
                  {imagenSeleccionada && <button onClick={subirImagenPharmacy} disabled={subiendoImagen} className={`px-4 py-2 rounded-lg ${btnSuccess} min-h-[40px]`}>Subir</button>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <input placeholder="Nombre *" value={formPharmacy.nombre} onChange={e => updPharmacy("nombre", e.target.value)} className={`w-full px-4 py-3 rounded-lg border ${bgInput} text-base`} />
              <input placeholder="Telefono" value={formPharmacy.telefono} onChange={e => updPharmacy("telefono", e.target.value)} className={`w-full px-4 py-3 rounded-lg border ${bgInput} text-base`} />
              <input placeholder="Direccion" value={formPharmacy.direccion} onChange={e => updPharmacy("direccion", e.target.value)} className={`w-full px-4 py-3 rounded-lg border ${bgInput} text-base`} />
              <input placeholder="Barrio" value={formPharmacy.barrio} onChange={e => updPharmacy("barrio", e.target.value)} className={`w-full px-4 py-3 rounded-lg border ${bgInput} text-base`} />
              <input placeholder="Ciudad" value={formPharmacy.ciudad} onChange={e => updPharmacy("ciudad", e.target.value)} className={`w-full px-4 py-3 rounded-lg border ${bgInput} text-base`} />
              <input placeholder="Horario" value={formPharmacy.horario} onChange={e => updPharmacy("horario", e.target.value)} className={`w-full px-4 py-3 rounded-lg border ${bgInput} text-base`} />
            </div>
            <button onClick={guardarPharmacy} className={`w-full mt-4 sm:mt-6 py-3 rounded-lg font-semibold ${btnPrimary} min-h-[48px]`}>Guardar</button>
          </div>
        </>
      );
    }

    if (seccion === "usuarios") {
      // Filtrar usuarios que no son de esta pharmacy (o no tienen pharmacy) y no son admin/superadmin
      const usuariosDisponibles = todosUsuarios.filter(u => 
        (!u.pharmacy_id || u.pharmacy_id !== perfil.pharmacy_id) && 
        u.rol !== "admin" && 
        u.rol !== "superadmin"
      );
      const filtrados = busquedaUsuario 
        ? usuariosDisponibles.filter(u => u.email?.toLowerCase().includes(busquedaUsuario.toLowerCase()) || u.nombre?.toLowerCase().includes(busquedaUsuario.toLowerCase()))
        : usuariosDisponibles;
      
      return (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold">👥 Mi Equipo</h2>
            <button onClick={() => setMostrarCrearUsuario(!mostrarCrearUsuario)} className={`px-3 sm:px-4 py-2 rounded-lg font-medium min-h-[44px] ${btnPrimary}`}>
              {mostrarCrearUsuario ? "✕ Cerrar" : "+ Agregar"}
            </button>
          </div>
          
          {mostrarCrearUsuario && (
            <div className={`${bgCard} rounded-xl p-3 sm:p-4 mb-4`}>
              <input 
                placeholder="Buscar por nombre o email..." 
                value={busquedaUsuario} 
                onChange={e => setBusquedaUsuario(e.target.value)} 
                className={`w-full px-4 py-3 rounded-lg border ${bgInput} mb-3 text-base`}
              />
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filtrados.length === 0 ? (
                  <div className="text-center py-4 text-slate-500">No se encontraron usuarios</div>
                ) : (
                  filtrados.map(u => (
                    <div key={u.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 rounded-lg ${bgLight}`}>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{u.nombre || "Sin nombre"}</div>
                        <div className="text-slate-500 text-xs">{u.email}</div>
                        <div className="text-xs text-slate-400">{u.rol || "cliente"}</div>
                      </div>
                      <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                        <select 
                          value={rolesSeleccionados[u.id] || "domiciliario"}
                          onChange={e => setRolesSeleccionados((prev: any) => ({ ...prev, [u.id]: e.target.value }))}
                          className={`px-2 py-2 rounded border ${bgInput} text-sm min-h-[40px] flex-1 sm:flex-none`}
                        >
                          <option value="domiciliario">🏍️ Repartidor</option>
                          <option value="farmaceutico">⚕️ Farmacéutico</option>
                        </select>
                        <button 
                          type="button"
                          onClick={() => crearUsuario(u.id, rolesSeleccionados[u.id] || "domiciliario")}
                          className={`px-3 py-2 ${btnSuccess} rounded text-sm font-medium min-h-[40px]`}
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          <h3 className="font-semibold mb-3">Equipo actual ({usuariosFarmacia.filter(u => u.rol !== "admin" && u.rol !== "superadmin").length})</h3>
          {usuariosFarmacia.filter(u => u.rol !== "admin" && u.rol !== "superadmin").length === 0 ? (
            <div className={`text-center py-8 text-slate-500 ${bgCard} rounded-xl`}>No hay usuarios en tu equipo</div>
          ) : (
            <div className="space-y-2">
              {usuariosFarmacia.filter(u => u.rol !== "admin" && u.rol !== "superadmin").map(u => (
                <div key={u.id} className={`${bgCard} rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
                  <div className="flex-1">
                    <div className="font-semibold text-sm sm:text-base">{u.nombre || "Sin nombre"}</div>
                    <div className="text-slate-500 text-xs sm:text-sm">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {u.rol === "admin" ? (
                      <span className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold whitespace-nowrap">
                        🏪 Administrador
                      </span>
                    ) : (
                      <>
                        <select value={u.rol || "cliente"} onChange={e => cambiarRolUsuario(u.id, e.target.value)} className={`px-2 sm:px-3 py-2 rounded-lg border ${bgInput} text-sm min-h-[40px]`}>
                          <option value="domiciliario">🏍️ Repartidor</option>
                          <option value="farmaceutico">⚕️ Farmacéutico</option>
                          <option value="cliente">👤 Cliente</option>
                        </select>
                        <button onClick={() => desvincularUsuario(u.id)} className="text-red-500 text-sm px-2 py-2 whitespace-nowrap">🗑️ Quitar</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (seccion === "productos") {
      return (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">💊 Productos</h2>
            <button onClick={() => { setMostrarForm(!mostrarForm); setEditando(null); setForm({ nombre: "", precio: "", categoria: "", stock: "", imagen: "💊", formula_medica: false }); }} className={`px-4 py-2 rounded-lg font-semibold ${mostrarForm ? btnDanger : btnPrimary}`}>
              {mostrarForm ? "Cancelar" : "+ Agregar"}
            </button>
          </div>
          {mostrarForm && (
            <div className={`${bgCard} rounded-xl p-6 mb-6`}>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nombre *" value={form.nombre} onChange={e => upd("nombre", e.target.value)} className={`px-4 py-3 rounded-lg border ${bgInput}`} />
                <input placeholder="Precio *" type="number" value={form.precio} onChange={e => upd("precio", e.target.value)} className={`px-4 py-3 rounded-lg border ${bgInput}`} />
                <input placeholder="Categoría" value={form.categoria} onChange={e => upd("categoria", e.target.value)} className={`px-4 py-3 rounded-lg border ${bgInput}`} />
                <input placeholder="Stock" type="number" value={form.stock} onChange={e => upd("stock", e.target.value)} className={`px-4 py-3 rounded-lg border ${bgInput}`} />
              </div>
              <label className="flex items-center gap-2 mt-3">
                <input type="checkbox" checked={form.formula_medica} onChange={e => upd("formula_medica", e.target.checked)} />
                <span>Requiere fórmula</span>
              </label>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setMostrarForm(false)} className="flex-1 bg-slate-500 text-white py-2 rounded-lg">Cancelar</button>
                <button onClick={guardarProducto} className="flex-1 bg-violet-600 text-white py-2 rounded-lg">Guardar</button>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="font-bold text-red-600 mb-3">Con Receta ({productosConFormula.length})</div>
              {productosConFormula.map(p => (
                <div key={p.id} className={`${bgCard} rounded-lg p-3 mb-2 flex justify-between items-center`}>
                  <div><div className="font-semibold">{p.nombre}</div><div className="text-sm text-slate-500">Stock: {p.stock} | {fmtCOP(p.precio)}</div></div>
                  <div className="flex gap-1">
                    <button onClick={() => iniciarEdicion(p)} className="text-violet-500">✏️</button>
                    <button onClick={() => eliminar(p.id)} className="text-red-500">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-bold text-green-600 mb-3">Venta Libre ({productosVentaLibre.length})</div>
              {productosVentaLibre.map(p => (
                <div key={p.id} className={`${bgCard} rounded-lg p-3 mb-2 flex justify-between items-center`}>
                  <div><div className="font-semibold">{p.nombre}</div><div className="text-sm text-slate-500">Stock: {p.stock} | {fmtCOP(p.precio)}</div></div>
                  <div className="flex gap-1">
                    <button onClick={() => iniciarEdicion(p)} className="text-violet-500">✏️</button>
                    <button onClick={() => eliminar(p.id)} className="text-red-500">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (seccion === "pedidos") {
      const pedidosActivos = pedidos.filter(p => p.estado !== "entregado" && p.estado !== "cancelado");
      const estadoColors: Record<string, string> = {
        pendiente: "bg-yellow-500",
        en_preparacion: "bg-blue-500",
        listo: "bg-orange-500",
        en_camino: "bg-violet-600",
        entregado: "bg-green-600",
        cancelado: "bg-red-600",
      };

      return (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">📋 Pedidos</h2>
            <div className={`text-sm ${modoOscuro ? "text-slate-400" : "text-slate-500"}`}>
              {pedidosActivos.length} activo{pedidosActivos.length !== 1 ? "s" : ""} · {pedidos.length} total{pedidos.length !== 1 ? "es" : ""}
            </div>
          </div>
          {pedidosActivos.length === 0 ? (
            <div className={`text-center py-12 ${bgCard} rounded-xl`}>
              <div className="text-4xl mb-3">📭</div>
              <div className="font-bold text-lg mb-1">No hay pedidos activos</div>
              <div className="text-slate-500 text-sm">Los pedidos entregados y cancelados aparecen en el Historial</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidosActivos.map(p => {
                const clienteNombre = p.cliente_nombre || "Cliente";
                return (
                  <div
                    key={p.id}
                    onClick={() => setPedidoSeleccionado(p)}
                    className={`${bgCard} rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-sm">#{p.id?.slice(-6)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${estadoColors[p.estado] || "bg-slate-500"}`}>
                            {estadoLabel[p.estado] || p.estado}
                          </span>
                          {p.tipo_venta === "presencial" && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">💰 Presencial</span>
                          )}
                        </div>
                        <div className={`text-sm font-medium ${modoOscuro ? "text-slate-300" : "text-slate-700"}`}>{clienteNombre}</div>
                        <div className="text-slate-400 text-xs">{fmtFecha(p.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-violet-600">{fmtCOP(p.total)}</div>
                        {p.codigo_verificacion && (
                          <div className={`text-xs px-2 py-1 rounded-lg font-bold mt-1 ${modoOscuro ? "bg-violet-900/40 text-violet-300" : "bg-violet-100 text-violet-700"}`}>
                            {p.codigo_verificacion}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pedidoSeleccionado && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPedidoSeleccionado(null)}>
              <div className={`${bgCard} rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-violet-600">Pedido #{pedidoSeleccionado.id?.slice(-6)}</h2>
                  <button onClick={() => setPedidoSeleccionado(null)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${modoOscuro ? "bg-slate-700 hover:bg-slate-600 text-slate-500" : "bg-slate-100 hover:bg-slate-200 text-slate-500"}`}>✕</button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Estado</span><span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${estadoColors[pedidoSeleccionado.estado] || "bg-slate-500"}`}>{estadoLabel[pedidoSeleccionado.estado] || pedidoSeleccionado.estado}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Fecha</span><span className="font-bold">{fmtFecha(pedidoSeleccionado.created_at)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Cliente</span><span className="font-bold">{pedidoSeleccionado.cliente_nombre || "N/A"}</span></div>
                  {pedidoSeleccionado.cliente_telefono && (
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Teléfono</span><span className="font-bold">{pedidoSeleccionado.cliente_telefono}</span></div>
                  )}
                  {pedidoSeleccionado.codigo_verificacion && (
                    <div className="text-center py-3 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
                      <div className={`text-xs font-semibold ${modoOscuro ? "text-violet-300" : "text-violet-600"}`}>Código de entrega</div>
                      <div className={`text-3xl font-bold ${modoOscuro ? "text-violet-300" : "text-violet-700"}`}>{pedidoSeleccionado.codigo_verificacion}</div>
                    </div>
                  )}
                </div>

                <div className={`border-t pt-3 mb-4 ${modoOscuro ? "border-slate-600" : "border-slate-200"}`}>
                  <div className="font-bold text-sm mb-2">Productos</div>
                  {pedidoSeleccionado.pedido_productos?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1.5">
                      <span>{item.productos?.nombre} x{item.cantidad}</span>
                      <span className="font-bold">{fmtCOP(item.precio_unitario * item.cantidad)}</span>
                    </div>
                  ))}
                </div>

                {pedidoSeleccionado.tipo_venta !== "presencial" && (
                  <div className={`border-t pt-3 mb-4 ${modoOscuro ? "border-slate-600" : "border-slate-200"}`}>
                    <div className="font-bold text-sm mb-2">Dirección de entrega</div>
                    <div className={`text-sm ${modoOscuro ? "text-slate-300" : "text-slate-700"}`}>
                      {pedidoSeleccionado.direccion_entrega || "No registrada"}
                    </div>
                  </div>
                )}

                <div className={`border-t pt-3 ${modoOscuro ? "border-slate-600" : "border-slate-200"}`}>
                  <div className="flex justify-between text-sm"><span>Domicilio</span><span>{fmtCOP(pedidoSeleccionado.costo_domicilio || 0)}</span></div>
                  <div className="flex justify-between font-bold text-lg mt-1"><span>Total</span><span className="text-violet-600">{fmtCOP(pedidoSeleccionado.total)}</span></div>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    if (seccion === "historial") {
      const entregados = pedidos.filter(p => p.estado === "entregado");
      const cancelados = pedidos.filter(p => p.estado === "cancelado");
      
      return (
        <>
          <h2 className="text-xl font-bold mb-4">📊 Historial de Pedidos</h2>
          {pedidos.length === 0 ? (
            <div className={`text-center py-12 text-slate-500 ${bgCard} rounded-xl`}>No hay pedidos</div>
          ) : (
            <>
              {entregados.length > 0 && (
                <div className="mb-6">
                  <div className="font-bold text-green-600 mb-3 flex items-center gap-2">✅ Entregados ({entregados.length})</div>
                  <div className="space-y-3">
                    {entregados.map(p => (
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
                            <div key={idx} className="text-sm text-slate-600 flex justify-between">
                              <span>{item.cantidad}x {item.productos?.nombre}</span>
                              <span className="font-semibold text-violet-600">{fmtCOP(item.precio_unitario * item.cantidad)}</span>
                            </div>
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
              
              {cancelados.length > 0 && (
                <div className="mb-6">
                  <div className="font-bold text-red-600 mb-3 flex items-center gap-2">❌ Cancelados ({cancelados.length})</div>
                  <div className="space-y-3">
                    {cancelados.map(p => (
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
                            <div key={idx} className="text-sm text-slate-600 flex justify-between">
                              <span>{item.cantidad}x {item.productos?.nombre}</span>
                              <span className="font-semibold text-violet-600">{fmtCOP(item.precio_unitario * item.cantidad)}</span>
                            </div>
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
        </>
      );
    }

    return null;
  };

  return (
    <div className={`min-h-screen font-sans ${bgMain}`}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-violet-600">🏪 {pharmacy?.nombre || "Mi Farmacia"}</h1>
          <p className="text-slate-400 text-sm">{pharmacy?.direccion} | {pharmacy?.telefono}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className={`${bgCard} rounded-xl p-3 sm:p-5 text-left`}><div className={`text-2xl sm:text-3xl font-extrabold ${statColors.primary}`}>{productosTotal}</div><div className="text-slate-400 text-xs sm:text-sm">Productos</div></div>
          <div className={`${bgCard} rounded-xl p-3 sm:p-5 text-left`}><div className={`text-2xl sm:text-3xl font-extrabold ${statColors.secondary}`}>{pedidosCount}</div><div className="text-slate-400 text-xs sm:text-sm">Pedidos</div></div>
          <div className={`${bgCard} rounded-xl p-3 sm:p-5 text-left`}><div className={`text-lg sm:text-2xl font-extrabold ${statColors.primary}`}>{fmtCOP(ingresosTotal)}</div><div className="text-slate-400 text-xs sm:text-sm">Ingresos</div></div>
          <div className={`${bgCard} rounded-xl p-3 sm:p-5 text-left`}><div className={`text-xl sm:text-2xl font-extrabold ${statColors.secondary}`}>{pharmacy?.estado || "..."}</div><div className="text-slate-400 text-xs sm:text-sm">Estado</div></div>
        </div>
        <div className="flex gap-2 mb-4 sm:mb-6 flex-wrap overflow-x-auto pb-2">
          {["mi-farmacia", "usuarios", "productos", "pedidos", "historial"].map(k => (
            <button key={k} onClick={() => setSeccion(k)} className={`px-3 sm:px-4 py-2 rounded-lg font-medium min-h-[44px] text-sm sm:text-base ${seccion === k ? btnPrimary : btnSecondary}`}>
              {k === "mi-farmacia" ? "🏪" : k === "usuarios" ? "👥" : k === "productos" ? "💊" : k === "pedidos" ? "📋" : "📊"}
            </button>
          ))}
        </div>
        {renderContenido()}
      </div>
    </div>
  );
}