import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Toast, useToast } from "../common/Toast";
import { useTheme } from "../../App";
import { estadoLabel } from "../../supabaseClient";

const COSTO_DOMICILIO = 3000;

function fmtCOP(price: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(price);
}

function fmtFecha(date: string) {
  return new Date(date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function Badge({ estado, modoOscuro }: { estado: string; modoOscuro: boolean }) {
  const colors: Record<string, string> = {
    pendiente: "bg-yellow-500 text-white",
    aprobado: "bg-green-600 text-white",
    rechazado: "bg-red-600 text-white",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[estado] || (modoOscuro ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600")}`}>
      {estado}
    </span>
  );
}

export default function VistaCliente({ perfil, cerrarSesion, seccion: seccionProp, setSeccion: setSeccionProp }: { perfil: any; cerrarSesion: () => void; seccion?: string; setSeccion?: (s: string) => void }) {
  const { modoOscuro } = useTheme();
  const bgMain = modoOscuro ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-800";
  const bgCard = modoOscuro 
    ? "bg-slate-900 border-l-4 border-violet-500" 
    : "bg-white border-l-4 border-violet-400 shadow-md rounded-r-xl";
  const bgLight = modoOscuro ? "bg-slate-800" : "bg-slate-100";
  const bgInput = modoOscuro ? "bg-slate-700 border-violet-500/30 text-white" : "bg-white border-violet-300 text-slate-800";
  const bgCantidad = modoOscuro ? "bg-slate-700" : "bg-violet-50";
  const btnCantidad = modoOscuro 
    ? "bg-slate-600 text-slate-200 hover:bg-violet-500 hover:text-white" 
    : "bg-white text-slate-700 shadow-sm hover:bg-violet-600 hover:text-white";
  const [seccionLocal, setSeccionLocal] = useState("inicio");
  const seccion = seccionProp || seccionLocal;
  const setSeccion = setSeccionProp || setSeccionLocal;
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [misPedidos, setMisPedidos] = useState<any[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [modalFormula, setModalFormula] = useState<any>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [metodoPago, setMetodoPago] = useState("");
  const [datosPago, setDatosPago] = useState({ numeroTarjeta: "", nombreTitular: "", expiry: "", cvv: "", numeroCelular: "" });
  const [mostrarPago, setMostrarPago] = useState(false);
  const [tipoEntrega, setTipoEntrega] = useState<"domicilio" | "recoger">("domicilio");
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [domiciliariosActivos, setDomiciliariosActivos] = useState(0);
const [codigoEntrega, setCodigoEntrega] = useState("");
const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
const [editando, setEditando] = useState(false);
const [datosEditados, setDatosEditados] = useState({ telefono: "", direccion: "", ciudad: "", barrio: "", fecha_nacimiento: "" });
const [subiendoFoto, setSubiendoFoto] = useState(false);

const { toast, show, clear } = useToast();

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  const extRef = params.get("external_reference") || "";
  if (status === "approved" || status === "success") {
    if (extRef) {
      supabase.from("pedidos").select("codigo_verificacion").eq("id", extRef).single()
        .then(({ data }) => {
          setCodigoEntrega(data?.codigo_verificacion || "(revisa tu pedido)");
        });
    }
    window.history.replaceState({}, "", "/");
    show("¡Pago exitoso! Pedido creado.");
  } else if (status === "rejected" || status === "cancelled" || status === "failure") {
    show("El pago fue cancelado o rechazado", "error");
    window.history.replaceState({}, "", "/");
  } else if (status === "pending" || status === "in_process") {
    show("El pago está pendiente", "warn");
    window.history.replaceState({}, "", "/");
  }
}, []);
  
  const subtotal = carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const totalCarrito = carrito.reduce((a, i) => a + i.cantidad, 0);
  const costoDom = tipoEntrega === "domicilio" ? COSTO_DOMICILIO : 0;
  const totalConDom = subtotal + costoDom;

  const [todosProductos, setTodosProductos] = useState<any[]>([]);
  const [farmaciaElegida, setFarmaciaElegida] = useState<number | null>(null);
  const [farmaciasList, setFarmaciasList] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("pharmacies").select("*").eq("estado", "aprobado").order("nombre")
      .then(({ data }: any) => setFarmaciasList(data || []));
    
    supabase.from("productos").select("*, pharmacies(nombre)").eq("pharmacies.estado", "aprobado").order("nombre")
      .then(({ data }: any) => {
        const combined = (data || []).map((p: any) => ({
          ...p,
          pharmacy_nombre: p.pharmacies?.nombre || "Farmacia"
        }));
        setTodosProductos(combined);
      });
    
    supabase.from("profiles")
      .select("id, rol, activo")
      .eq("rol", "domiciliario")
      .eq("activo", true)
      .then(({ data }: any) => {
        const activos = data?.filter((u: any) => u.activo !== false).length || 0;
        setDomiciliariosActivos(activos);
      });
  }, []);

  const validarTarjeta = (numero: string): { valida: boolean; tipo: string } => {
    const limpio = numero.replace(/\s/g, "");
    if (!/^\d+$/.test(limpio) || limpio.length < 13 || limpio.length > 19) return { valida: false, tipo: "" };
    let suma = 0, alternar = false;
    for (let i = limpio.length - 1; i >= 0; i--) {
      let d = parseInt(limpio[i]);
      if (alternar) { d *= 2; if (d > 9) d -= 9; }
      suma += d; alternar = !alternar;
    }
    if (suma % 10 !== 0) return { valida: false, tipo: "" };
    const p = parseInt(limpio[0]), p2 = parseInt(limpio.substring(0, 2));
    if (p === 4) return { valida: true, tipo: "Visa" };
    if (p2 >= 51 && p2 <= 55) return { valida: true, tipo: "Mastercard" };
    if (p === 3 && (limpio[1] === "4" || limpio[1] === "7")) return { valida: true, tipo: "Amex" };
    if (limpio.startsWith("6011") || limpio.startsWith("65") || (parseInt(limpio.substring(0, 3)) >= 644 && parseInt(limpio.substring(0, 3)) <= 649)) return { valida: true, tipo: "Discover" };
    return { valida: true, tipo: "Tarjeta" };
  };

  const logoMarca: Record<string, string> = {
    Visa: "VISA",
    Mastercard: "MC",
    Amex: "Amex",
    Discover: "Discover",
    Tarjeta: "💳",
  };

  const formatearNumero = (v: string) => {
    const nums = v.replace(/\D/g, "").slice(0, 19);
    return nums.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatearExpiry = (v: string) => {
    const nums = v.replace(/\D/g, "").slice(0, 4);
    if (nums.length >= 3) return nums.slice(0, 2) + "/" + nums.slice(2);
    return nums;
  };

  const validarExpiry = (expiry: string): boolean => {
    const match = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) return false;
    const mes = parseInt(match[1]), anio = parseInt("20" + match[2]);
    return new Date(anio, mes - 1) > new Date();
  };

  const validarCVV = (cvv: string): boolean => /^\d{3,4}$/.test(cvv);

  const validarCelular = (celular: string): boolean => {
    return celular.length === 10;
  };

  const metodosPago = [
    { id: "tarjeta", nombre: "💳 Tarjeta" },
    { id: "nequi", nombre: "📱 Nequi" },
    { id: "efectivo", nombre: "💵 Efectivo" },
  ];

  const cargarFormulas = useCallback(() => {
    supabase.from("formulas").select("*, productos(nombre)")
      .eq("usuario_id", perfil.id).order("created_at", { ascending: false })
      .then(({ data }: any) => setFormulas(data || []));
  }, [perfil.id]);

  useEffect(() => { cargarFormulas(); }, [cargarFormulas]);

  const cargarMisPedidos = useCallback(() => {
    setCargandoPedidos(true);
    supabase.from("pedidos")
      .select("*, pedido_productos(*, productos(nombre)), pharmacies(nombre)")
      .eq("cliente_id", perfil.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }: any) => { 
        setMisPedidos(data || []); 
        setCargandoPedidos(false);
      });
  }, [perfil.id]);

  useEffect(() => { 
    if (seccion === "pedidos") cargarMisPedidos(); 
    if (seccion === "catalogo") cargarFormulas();
  }, [seccion, cargarMisPedidos, cargarFormulas]);

  useEffect(() => {
    if (seccion !== "pedidos" || !perfil?.id) return;
    const channel = supabase.channel("pedidos-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos", filter: `cliente_id=eq.${perfil.id}` }, () => cargarMisPedidos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [seccion, perfil?.id, cargarMisPedidos]);

  useEffect(() => {
    if (!perfil?.id) return;
    cargarFormulas();
    const interval = setInterval(() => cargarFormulas(), 3000);
    return () => clearInterval(interval);
  }, [perfil?.id, cargarFormulas]);

  const agregarCarrito = (producto: any) => {
    const formulasProducto = formulas.filter(f => f.producto_id === producto.id);
    const formulaAprobada = formulasProducto.find(f => f.estado === "aprobado");
    const formulaPendiente = formulasProducto.find(f => f.estado === "pendiente");
    
    if (producto.formula_medica) {
      if (formulaPendiente) {
        show("Tu fórmula está en revisión", "warn");
        return;
      }
      if (!formulaAprobada) {
        setModalFormula(producto);
        return;
      }
    }
    
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
      if (nuevaCantidad > item.stock) return prev;
      return prev.map(p => p.id === id ? { ...p, cantidad: nuevaCantidad } : p);
    });
  };

  const subirFormula = async (producto: any) => {
    const input = document.getElementById("formula-input") as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) { show("Selecciona una imagen", "error"); return; }
    
    setSubiendo(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${perfil.id}/${producto.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage.from("formulas").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    });
    
    if (error) { 
      show("Error al subir: " + error.message, "error"); 
      setSubiendo(false); 
      return; 
    }
    
    const { data: urlData } = supabase.storage.from("formulas").getPublicUrl(fileName);
    
    await supabase.from("formulas").insert({
      usuario_id: perfil.id,
      producto_id: producto.id,
      foto_url: urlData.publicUrl
    });
    
    show("Fórmula subida! En revisión.");
    setModalFormula(null);
    cargarFormulas();
    setSubiendo(false);
  };

  const abrirPago = () => {
    if (carrito.length === 0) return;
    if (!perfil?.id) { show("Error: usuario no identificado", "error"); return; }
    setTipoEntrega("domicilio");
    setMostrarPago(true);
  };

  const guardarPerfil = async () => {
    if (!perfil?.id) return;
    
    const { error } = await supabase.from("profiles").update({
      telefono: datosEditados.telefono || null,
      direccion: datosEditados.direccion || null,
      ciudad: datosEditados.ciudad || null,
      barrio: datosEditados.barrio || null,
      fecha_nacimiento: datosEditados.fecha_nacimiento || null,
    }).eq("id", perfil.id);
    
    if (error) {
      show("Error al guardar: " + error.message, "error");
    } else {
      const { data: perfilActualizado } = await supabase.from("profiles").select("*").eq("id", perfil.id).single();
      if (perfilActualizado) {
        window.dispatchEvent(new CustomEvent("perfil-actualizado", { detail: perfilActualizado }));
      }
      show("Datos guardados correctamente!");
      setEditando(false);
    }
  };

  const subirFotoPerfil = async () => {
    const input = document.getElementById("foto-perfil-input") as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) { show("Selecciona una imagen", "error"); return; }
    
    setSubiendoFoto(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `perfiles/${perfil.id}/avatar.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from("fotos").upload(fileName, file, { cacheControl: "3600", upsert: true });
    
    if (uploadError) {
      show("Error al subir: " + uploadError.message, "error");
      setSubiendoFoto(false);
      return;
    }
    
    const { data: urlData } = supabase.storage.from("fotos").getPublicUrl(fileName);
    
    await supabase.from("profiles").update({ foto_url: urlData.publicUrl }).eq("id", perfil.id);
    
    show("Foto actualizada!");
    setSubiendoFoto(false);
  };

  const getPubKey = () => {
    if (import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY) return import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
    if ((window as any).__ENV__?.VITE_MERCADOPAGO_PUBLIC_KEY) return (window as any).__ENV__.VITE_MERCADOPAGO_PUBLIC_KEY;
    return "";
  };

  const tokenizarTarjeta = async () => {
    const pubKey = getPubKey();
    if (!pubKey) throw new Error("MP public key no configurada");
    const [mes, anio] = datosPago.expiry.split("/");
    const resp = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${pubKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_number: datosPago.numeroTarjeta.replace(/\s/g, ""),
        cardholder: { name: datosPago.nombreTitular },
        expiration_month: parseInt(mes),
        expiration_year: parseInt("20" + anio),
        security_code: datosPago.cvv,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.message || data?.error || "Error al tokenizar tarjeta");
    return data.id;
  };

  const realizarPedido = async () => {
    if (!metodoPago) { show("Selecciona un método de pago", "error"); return; }
    
    if (metodoPago === "tarjeta" || metodoPago === "pse") {
      if (!datosPago.numeroTarjeta || !datosPago.nombreTitular || !datosPago.expiry || !datosPago.cvv) {
        show("Completa todos los datos de la tarjeta", "error"); return;
      }
      
      const validacion = validarTarjeta(datosPago.numeroTarjeta);
      if (!validacion.valida) {
        show("Número de tarjeta inválido", "error"); return;
      }
      
      if (!validarExpiry(datosPago.expiry)) {
        show("Fecha de expiración inválida o tarjeta vencida", "error"); return;
      }
      
      if (!validarCVV(datosPago.cvv)) {
        show("CVV inválido (3 o 4 dígitos)", "error"); return;
      }
    }
    
    if (metodoPago === "nequi") {
      if (!datosPago.numeroCelular || !validarCelular(datosPago.numeroCelular)) {
        show("Número de celular inválido para Nequi", "error"); return;
      }
    }
    
    setProcesandoPago(true);
    await new Promise(r => setTimeout(r, 1500));
    
    for (const item of carrito) {
      const { data: producto } = await supabase.from("productos").select("stock").eq("id", item.id).single();
      if (!producto || producto.stock < item.cantidad) {
        show(`No hay suficiente stock de ${item.nombre}. Stock actual: ${producto?.stock || 0}`, "error");
        setProcesandoPago(false);
        return;
      }
    }
    
    setMostrarPago(false);
    
    const codigoVerificacion = Math.floor(1000 + Math.random() * 9000).toString();
    
    const { data: pedido, error } = await supabase.from("pedidos").insert({
      cliente_id: perfil.id, 
      pharmacy_id: carrito[0]?.pharmacy_id || null,
      estado: "pendiente", 
      total: totalConDom, 
      costo_domicilio: costoDom, 
      entregado: false,
      metodo_pago: metodoPago,
      codigo_verificacion: codigoVerificacion,
      cliente_nombre: perfil.nombre || perfil.email || "Cliente",
      cliente_telefono: perfil.telefono || "",
      direccion_entrega: tipoEntrega === "recoger" 
        ? (farmaciasList.find(f => f.id === farmaciaElegida)?.direccion || "")
        : (perfil.direccion || ""),
    }).select().single();
    
    if (error || !pedido) { 
      show("Error al crear pedido: " + (error?.message || "Sin datos"), "error"); 
      setProcesandoPago(false);
      return; 
    }

    const items = carrito.map(i => ({ pedido_id: pedido.id, producto_id: i.id, cantidad: i.cantidad, precio_unitario: i.precio }));
    await supabase.from("pedido_productos").insert(items);
    
    await supabase.from("facturas").insert({ pedido_id: pedido.id, total: totalConDom, fecha: new Date().toISOString() });

    for (const item of carrito) {
      await supabase.from("productos").update({ stock: item.stock - item.cantidad }).eq("id", item.id);
    }
    
    const productosConFormula = carrito.filter(i => i.formula_medica);
    for (const item of productosConFormula) {
      await supabase.from("formulas")
        .delete()
        .eq("usuario_id", perfil.id)
        .eq("producto_id", item.id)
        .eq("estado", "aprobado");
    }
    cargarFormulas();

    if (metodoPago === "tarjeta") {
      try {
        const cardToken = await tokenizarTarjeta();
        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const payResp = await fetch(`${apiUrl}/api/create-card-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: cardToken,
            transaction_amount: totalConDom,
            description: `Pedido #${pedido.id?.slice(-6)} - FarmaciaApp`,
            payer_email: perfil.email || "",
            installments: 1,
          }),
        });
        const payData = await payResp.json();
        if (!payResp.ok || payData.status !== "approved") {
          show("El pago fue rechazado: " + (payData.error || "intenta de nuevo"), "error");
          setProcesandoPago(false);
          return;
        }
        setCarrito([]);
        setSeccion("pedidos");
        setProcesandoPago(false);
        setCodigoEntrega(codigoVerificacion);
        show("¡Pago exitoso! Pedido realizado. Código: " + codigoVerificacion);
      } catch (err: any) {
        show("Error de pago: " + err.message, "error");
        setProcesandoPago(false);
      }
      return;
    }

    if (metodoPago === "nequi") {
      const mpItems = carrito.map(i => ({
        title: i.nombre,
        quantity: i.cantidad,
        unit_price: i.precio,
      }));
      if (costoDom > 0) {
        mpItems.push({
          title: "Costo de domicilio",
          quantity: 1,
          unit_price: costoDom,
        });
      }
      try {
        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const resp = await fetch(`${apiUrl}/api/create-preference`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: mpItems,
            payer: { email: perfil.email || "" },
            external_reference: pedido.id,
          }),
        });
        const data = await resp.json();
        if (data.init_point) {
          setCarrito([]);
          setProcesandoPago(false);
          window.location.href = data.init_point;
          return;
        } else {
          show("Error al crear preferencia: " + (data.error || "Error desconocido"), "error");
          setProcesandoPago(false);
          return;
        }
      } catch (err: any) {
        show("Error de conexión: " + err.message, "error");
        setProcesandoPago(false);
        return;
      }
    }
    
    setCarrito([]);
    setSeccion("pedidos");
    setProcesandoPago(false);
    setCodigoEntrega(codigoVerificacion);
    show(`¡Pago exitoso! Pedido realizado. Tu código de entrega: ${codigoVerificacion}`);
  };

  const filtrados = todosProductos.filter(p => 
    (!farmaciaElegida || p.pharmacy_id === farmaciaElegida) &&
    (p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.pharmacy_nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

return (
    <div className={`min-h-screen font-sans ${bgMain}`}>
      <Toast msg={toast.msg} tipo={toast.tipo} onClose={clear} />

      {seccion === "inicio" && (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-violet-600 mb-1">🏠 Elige tu farmacia</h1>
          <p className="text-slate-500 mb-4 sm:mb-6 text-sm">Selecciona una farmacia cercana para comprar</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {farmaciasList.map(f => (
              <button
                key={f.id}
                onClick={() => { setFarmaciaElegida(f.id); setSeccion("catalogo"); }}
                className={`${bgCard} rounded-xl p-4 sm:p-5 shadow-sm text-left hover:ring-2 hover:ring-violet-500 transition-all min-h-[100px]`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-violet-100 flex items-center justify-center text-2xl sm:text-3xl overflow-hidden flex-shrink-0">
                    {f.imagen_url ? <img src={f.imagen_url} alt={f.nombre} className="w-full h-full object-cover" /> : "🏪"}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-base sm:text-lg">{f.nombre}</div>
                    <div className="text-slate-500 text-xs sm:text-sm">📍 {f.direccion}</div>
                    <div className="text-slate-500 text-xs sm:text-sm">📞 {f.telefono}</div>
                    {f.horario && <div className="text-slate-500 text-xs sm:text-sm">🕐 {f.horario}</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {seccion === "cuenta" && (
          <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-violet-600 mb-4 sm:mb-6">👤 Mi Cuenta</h1>
            <div className={`${bgCard} rounded-xl p-4 sm:p-6 mb-4`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <label className="cursor-pointer relative">
                  <input type="file" id="foto-perfil-input" accept="image/*" className="hidden" onChange={subirFotoPerfil} />
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-violet-100 flex items-center justify-center text-2xl sm:text-3xl overflow-hidden">
                    {perfil?.foto_url ? (
                      <img src={perfil.foto_url} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                      perfil?.nombre?.charAt(0).toUpperCase() || "👤"
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs">📷</div>
                </label>
                <div>
                  <div className="text-lg sm:text-xl font-bold">{perfil?.nombre || "Cliente"}</div>
                  <div className="text-slate-500 text-sm">{perfil?.email || ""}</div>
                </div>
              </div>
              <button onClick={() => { setEditando(!editando); if (!editando) setDatosEditados({ telefono: perfil?.telefono || "", direccion: perfil?.direccion || "", ciudad: perfil?.ciudad || "", barrio: perfil?.barrio || "", fecha_nacimiento: perfil?.fecha_nacimiento || "" }); }} className="text-violet-600 font-medium text-sm">
                {editando ? "✕" : "✏️"}
              </button>
            </div>
            
            <div className="border-t border-slate-200 pt-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-sm text-slate-500">Teléfono</div>
                  {editando ? (
                    <input value={datosEditados.telefono} onChange={e => setDatosEditados(d => ({ ...d, telefono: e.target.value }))} placeholder="Teléfono" className={`w-full px-3 py-2 border ${bgInput} rounded`} />
                  ) : (
                    <div className="font-medium text-sm sm:text-base">{perfil?.telefono || "No registrado"}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-slate-500">Documento</div>
                  <div className="font-medium text-sm sm:text-base">{perfil?.documento || "No registrado"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Dirección</div>
                  {editando ? (
                    <input value={datosEditados.direccion} onChange={e => setDatosEditados(d => ({ ...d, direccion: e.target.value }))} placeholder="Dirección" className={`w-full px-3 py-2 border ${bgInput} rounded`} />
                  ) : (
                    <div className="font-medium text-sm sm:text-base">{perfil?.direccion || "No registrada"}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-slate-500">Ciudad</div>
                  {editando ? (
                    <input value={datosEditados.ciudad} onChange={e => setDatosEditados(d => ({ ...d, ciudad: e.target.value }))} placeholder="Ciudad" className={`w-full px-3 py-2 border ${bgInput} rounded`} />
                  ) : (
                    <div className="font-medium text-sm sm:text-base">{perfil?.ciudad || "No registrada"}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-slate-500">Barrio</div>
                  {editando ? (
                    <input value={datosEditados.barrio} onChange={e => setDatosEditados(d => ({ ...d, barrio: e.target.value }))} placeholder="Barrio" className={`w-full px-3 py-2 border ${bgInput} rounded`} />
                  ) : (
                    <div className="font-medium text-sm sm:text-base">{perfil?.barrio || "No registrado"}</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-slate-500">Fecha de nacimiento</div>
                  {editando ? (
                    <input type="date" value={datosEditados.fecha_nacimiento} onChange={e => setDatosEditados(d => ({ ...d, fecha_nacimiento: e.target.value }))} className={`w-full px-3 py-2 border ${bgInput} rounded`} />
                  ) : (
                    <div className="font-medium text-sm sm:text-base">{perfil?.fecha_nacimiento || "No registrada"}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {editando && (
            <button onClick={guardarPerfil} className="w-full bg-violet-600 text-white py-3 rounded-lg font-semibold mb-3 min-h-[48px]">
              Guardar Cambios
            </button>
          )}
          
          <button onClick={cerrarSesion} className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold min-h-[48px]">
            Cerrar Sesión
          </button>
        </div>
      )}

      {seccion === "catalogo" && (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-violet-600">{farmaciaElegida ? farmaciasList.find(f => f.id === farmaciaElegida)?.nombre : "Todas las farmacias"}</h1>
            <button onClick={() => setSeccion("carrito")} className="relative p-2">
              🛒 <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{totalCarrito}</span>
            </button>
          </div>
          
          <input 
            placeholder="Buscar producto..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)}
            className={`w-full px-4 py-3 border ${bgInput} rounded-lg mb-4 text-base`}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {filtrados.slice(0, 12).map(p => {
              const enCarrito = carrito.find(c => c.id === p.id);
              const cantidad = enCarrito?.cantidad || 0;
              return (
                <div key={p.id} className={`${bgCard} p-3 sm:p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/20 cursor-pointer group`}>
                  <div className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-full text-center mb-2">{p.pharmacy_nombre}</div>
                  <div className="text-sm sm:text-base font-bold mb-1 group-hover:text-violet-600 transition-colors">{p.nombre}</div>
                  <div className="text-violet-600 font-bold text-base sm:text-lg">{fmtCOP(p.precio)}</div>
                  <div className={`text-xs mb-3 ${p.stock <= 3 ? "text-red-500" : "text-green-600"}`}>
                    {p.stock > 0 ? `${p.stock} disp.` : "Sin stock"}
                  </div>
                  {p.formula_medica && <div className="text-xs bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 px-3 py-1.5 rounded-full font-semibold mb-3 inline-block">Formula</div>}
                  
                  {cantidad === 0 ? (
                    <button 
                      onClick={() => agregarCarrito(p)}
                      className="w-full bg-gradient-to-r from-violet-600 to-violet-700 text-white py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 min-h-[44px]"
                    >
                      + Agregar
                    </button>
                  ) : (
                    <div className={`flex items-center justify-center gap-2 ${bgCantidad} rounded-full px-2 py-1`}>
                      <button onClick={() => cambiarCantidad(p.id, -1)} className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full shadow-md text-lg font-bold transition-all active:scale-90 ${btnCantidad}`}>-</button>
                      <span className="w-8 text-center font-bold text-violet-600">{cantidad}</span>
                      <button onClick={() => agregarCarrito(p)} className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full shadow-md text-lg font-bold transition-all active:scale-90 ${btnCantidad}`}>+</button>
                    </div>
                  )}
                  {cantidad > 0 && (
                    <button 
                      onClick={() => setSeccion("carrito")} 
                      className="w-full bg-gradient-to-r from-violet-600 via-violet-500 to-violet-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-600/40 hover:shadow-xl hover:shadow-violet-500/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 mt-2 min-h-[44px]"
                    >
                      🛒 Ir al carrito
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {seccion === "carrito" && (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSeccion("catalogo")} className="text-violet-600 font-medium min-h-[44px]">← Catálogo</button>
            <h1 className="text-lg sm:text-xl font-bold text-violet-600">Carrito</h1>
            <div></div>
          </div>
          
{carrito.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {Object.keys(carrito).length === 0 ? "Carrito vacio" : "Todos los productos eliminados"}
            </div>
          ) : (
            <div>
              {carrito.map(p => (
                <div key={p.id} className={`${bgCard} p-3 sm:p-4 rounded-2xl mb-3 flex items-center gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-all duration-200`}>
                  <div className="flex-1">
                    <div className={`font-bold text-sm sm:text-base ${modoOscuro ? "text-violet-300" : "text-violet-700"}`}>{p.nombre}</div>
                    <div className={`font-semibold text-sm sm:text-base ${modoOscuro ? "text-violet-400" : "text-violet-600"}`}>{fmtCOP(p.precio * p.cantidad)}</div>
                    <div className="text-xs text-slate-500">{fmtCOP(p.precio)} c/u</div>
                  </div>
                  <div className={`flex items-center gap-2 sm:gap-3 ${bgCantidad} rounded-full px-1 py-1`}>
                      <button 
                        onClick={() => cambiarCantidad(p.id, -1)} 
                        className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full shadow-md text-lg font-bold transition-all duration-200 active:scale-90 flex items-center justify-center ${btnCantidad}`}
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold text-violet-600">{p.cantidad}</span>
                      <button 
                        onClick={() => cambiarCantidad(p.id, 1)} 
                        disabled={p.cantidad >= p.stock}
                        className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full shadow-md text-lg font-bold transition-all duration-200 active:scale-90 flex items-center justify-center disabled:opacity-40 ${btnCantidad}`}
                      >
                        +
                      </button>
                    </div>
                </div>
              ))}
              {carrito.length === 0 && (
                <div className="text-center py-8 text-slate-500">Todos los productos eliminados</div>
              )}
              <div className={`${bgCard} p-4 rounded-xl mb-4`}>
                <div className="flex justify-between mb-2"><span>Subtotal</span><span>{fmtCOP(subtotal)}</span></div>
                <div className="flex justify-between mb-2"><span>Domicilio</span><span>{fmtCOP(costoDom)}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{fmtCOP(totalConDom)}</span></div>
              </div>
              
              <div className={`${bgCard} p-4 rounded-xl mb-4`}>
                <div className="font-bold text-sm mb-3">Tipo de entrega</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTipoEntrega("domicilio")}
                    className={`p-4 rounded-xl text-center transition-all min-h-[80px] ${
                      tipoEntrega === "domicilio"
                        ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-xl shadow-violet-500/30"
                        : `${modoOscuro ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-700"} hover:border-violet-400 border-2 border-transparent`
                    }`}
                  >
                    <div className="text-2xl mb-1">🏍️</div>
                    <div className="font-bold text-sm">A domicilio</div>
                    <div className="text-xs opacity-80">+{fmtCOP(COSTO_DOMICILIO)}</div>
                  </button>
                  <button
                    onClick={() => setTipoEntrega("recoger")}
                    className={`p-4 rounded-xl text-center transition-all min-h-[80px] ${
                      tipoEntrega === "recoger"
                        ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-xl shadow-violet-500/30"
                        : `${modoOscuro ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-700"} hover:border-violet-400 border-2 border-transparent`
                    }`}
                  >
                    <div className="text-2xl mb-1">🏪</div>
                    <div className="font-bold text-sm">Recoger en tienda</div>
                    <div className="text-xs opacity-80">Gratis</div>
                  </button>
                </div>
                {tipoEntrega === "domicilio" && (
                  <div className={`mt-3 p-3 rounded-xl border ${modoOscuro ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-200"}`}>
                    <div className={`text-xs font-semibold mb-1 ${modoOscuro ? "text-blue-300" : "text-blue-700"}`}>Dirección de entrega:</div>
                    <div className={`text-sm ${modoOscuro ? "text-blue-400" : "text-blue-600"}`}>{perfil?.direccion || "No registrada - Edítala en Mi Cuenta"}</div>
                  </div>
                )}
                {tipoEntrega === "recoger" && (
                  <div className={`mt-3 p-4 rounded-xl border ${modoOscuro ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200"}`}>
                    <div className={`text-xs font-semibold mb-2 ${modoOscuro ? "text-green-300" : "text-green-700"}`}>Recoger en:</div>
                    <div className={`text-base font-bold ${modoOscuro ? "text-green-300" : "text-green-700"}`}>
                      🏪 {(farmaciasList.find(f => f.id === farmaciaElegida) as any)?.nombre || "Farmacia seleccionada"}
                    </div>
                    <div className={`text-sm mt-1 ${modoOscuro ? "text-green-400" : "text-green-600"}`}>
                      📍 {(farmaciasList.find(f => f.id === farmaciaElegida) as any)?.direccion || ""}
                    </div>
                  </div>
                )}
              </div>
              
              {carrito.length > 0 && (
                <button onClick={abrirPago} className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-lg font-bold text-base min-h-[48px]">Continuar</button>
              )}
            </div>
          )}
        </div>
      )}

      {seccion === "pedidos" && (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-violet-600 mb-4 sm:mb-6">Mis Pedidos</h1>
          {cargandoPedidos ? <div className="text-center py-12">Cargando...</div> : misPedidos.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No hay pedidos</div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {misPedidos.map(pedido => {
                const estadoColors: Record<string, string> = {
                  pendiente: "bg-yellow-500",
                  en_preparacion: "bg-blue-500",
                  listo: "bg-orange-500",
                  en_camino: "bg-violet-600",
                  entregado: "bg-green-600",
                  cancelado: "bg-red-600",
                };
                return (
                  <div
                    key={pedido.id}
                    onClick={() => setPedidoSeleccionado(pedido)}
                    className={`${bgCard} p-3 sm:p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-sm sm:text-base">#{pedido.id}</span>
                          <span className={`px-2 sm:px-3 py-0.5 rounded-full text-xs font-bold text-white ${estadoColors[pedido.estado] || "bg-slate-500"}`}>
                            {estadoLabel[pedido.estado] || pedido.estado}
                          </span>
                        </div>
                        <div className="text-slate-500 text-xs sm:text-sm">{pedido.pharmacies?.nombre || "Farmacia"}</div>
                        <div className="text-slate-400 text-xs">{fmtFecha(pedido.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-violet-600 text-sm sm:text-base">{fmtCOP(pedido.total)}</div>
                        {pedido.codigo_verificacion && pedido.estado !== "entregado" && pedido.estado !== "cancelado" && (
                          <div className={`text-xs px-2 py-1 rounded-lg font-bold mt-1 ${modoOscuro ? "bg-violet-900/40 text-violet-300" : "bg-violet-100 text-violet-700"}`}>
                            {pedido.codigo_verificacion}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {seccion === "formulas" && (
        <div className="max-w-3xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-violet-600 mb-6">Mis Fórmulas</h1>
          
          {formulas.length === 0 ? (
            <div className={`text-center py-12 text-slate-500 ${bgCard} rounded-xl`}>No hay fórmulas</div>
          ) : (
            formulas.map(f => (
              <div key={f.id} className={`${bgCard} rounded-xl p-4 mb-3 shadow-sm`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-bold">{f.productos?.nombre}</div>
                    <div className="text-slate-500 text-xs">{fmtFecha(f.created_at)}</div>
                  </div>
                  <Badge estado={f.estado} modoOscuro={modoOscuro} />
                </div>
                {f.observacion && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${
                    f.estado === "aprobado" 
                      ? "bg-green-100 border border-green-300 text-green-800" 
                      : "bg-red-100 border border-red-300 text-red-800"
                  }`}>
                    <div className="font-bold mb-1">{f.estado === "aprobado" ? "✅ Observación del farmacéutico:" : "❌ Motivo del rechazo:"}</div>
                    <div>{f.observacion}</div>
                  </div>
                )}
                {f.estado === "pendiente" && (
                  <div className={`mt-2 text-sm flex items-center gap-2 ${modoOscuro ? "text-yellow-400" : "text-yellow-600"}`}>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    En revisión por el farmacéutico
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {modalFormula && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className={`${bgCard} p-6 rounded-2xl max-w-sm`}>
            <div className="text-xl font-bold mb-3">Subir fórmula médica</div>
            <div className="text-slate-500 mb-4">{modalFormula.nombre}</div>
            
            <label className="block">
              <input 
                type="file" 
                id="formula-input" 
                accept="image/*" 
                className="hidden" 
              />
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-violet-500 hover:bg-blue-50 transition-colors">
                <div className="text-4xl mb-2">📷</div>
                <div className="font-semibold text-slate-700">Toca para subir la foto</div>
                <div className="text-slate-500 text-sm mt-1">de tu fórmula médica</div>
              </div>
            </label>
            
            <div className="flex gap-2 mt-4">
              <button 
                className="flex-1 bg-slate-500 text-white py-2 rounded-lg font-semibold"
                onClick={() => setModalFormula(null)}>
                Cancelar
              </button>
              <button 
                className="flex-1 bg-purple-700 text-white py-2 rounded-lg font-semibold hover:bg-purple-600"
                onClick={() => subirFormula(modalFormula)}
                disabled={subiendo}>
                {subiendo ? "Subiendo..." : "Subir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarPago && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className={`${bgCard} rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200/50 max-h-[90vh] overflow-y-auto scrollbar-hide`}>
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-600 to-violet-800 bg-clip-text text-transparent">Método de Pago</h2>
                <p className="text-slate-400 text-sm mt-1">Total: <span className="font-bold text-violet-600">{fmtCOP(totalConDom)}</span></p>
              </div>
              <button onClick={() => { setMostrarPago(false); setMetodoPago(""); }} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all duration-300 hover:rotate-90">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              {metodosPago.map((m, i) => (
                <button 
                  key={m.id} 
                  onClick={() => setMetodoPago(m.id)} 
                  className={`w-full p-4 sm:p-5 rounded-2xl text-left flex items-center gap-3 sm:gap-4 transition-all duration-300 min-h-[56px] sm:min-h-[64px] ${
                    metodoPago === m.id 
                      ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-xl shadow-violet-500/40 scale-[1.02]" 
                      : "bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 hover:border-violet-300 hover:shadow-lg"
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${metodoPago === m.id ? "bg-white/20" : "bg-violet-100"}`}>
                    <span className="text-xl sm:text-2xl">{m.nombre.split(" ")[0]}</span>
                  </div>
                  <span className={`font-bold text-base sm:text-lg ${metodoPago === m.id ? "text-white" : "text-slate-700"}`}>{m.nombre.split(" ").slice(1).join(" ")}</span>
                  {metodoPago === m.id && (
                    <div className="ml-auto w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {metodoPago === "tarjeta" && (
              <div className={`space-y-3 sm:space-y-4 mb-6 sm:mb-8 p-4 sm:p-5 rounded-2xl border-2 ${modoOscuro ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                <div className="relative">
                  <label className={`text-xs font-semibold mb-1 block ${modoOscuro ? "text-slate-400" : "text-slate-500"}`}>Número de tarjeta</label>
                  <input
                    placeholder="1234 5678 9012 3456"
                    value={datosPago.numeroTarjeta}
                    onChange={e => setDatosPago(d => ({ ...d, numeroTarjeta: formatearNumero(e.target.value) }))}
                    inputMode="numeric"
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all text-base tracking-wider ${modoOscuro ? "border-slate-600 bg-slate-700 text-white" : "border-slate-200 bg-white text-slate-800"}`}
                  />
                  <div className="absolute right-3 top-8 text-sm font-bold">
                    {datosPago.numeroTarjeta.replace(/\s/g, "").length < 13 ? (
                      <span className="text-slate-400">💳</span>
                    ) : (
                      (() => {
                        const info = validarTarjeta(datosPago.numeroTarjeta);
                        return info.valida ? (
                          <span className="text-green-500">{info.tipo === "Visa" ? <img src={VISA_IMG} className="h-5 inline" alt="Visa" /> : info.tipo === "Mastercard" ? <img src={MC_IMG} className="h-5 inline" alt="Mastercard" /> : "✅"}</span>
                        ) : (
                          <span className="text-red-500">❌</span>
                        );
                      })()
                    )}
                  </div>
                </div>
                {datosPago.numeroTarjeta.replace(/\s/g, "").length >= 13 && (
                  <div className={`text-xs font-semibold ${validarTarjeta(datosPago.numeroTarjeta).valida ? "text-green-600" : "text-red-500"}`}>
                    {validarTarjeta(datosPago.numeroTarjeta).valida
                      ? "✅ " + validarTarjeta(datosPago.numeroTarjeta).tipo + " válida"
                      : "❌ Tarjeta no válida"}
                  </div>
                )}
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${modoOscuro ? "text-slate-400" : "text-slate-500"}`}>Nombre del titular</label>
                  <input placeholder="Como aparece en la tarjeta" value={datosPago.nombreTitular} onChange={e => setDatosPago(d => ({ ...d, nombreTitular: e.target.value }))} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all text-base ${modoOscuro ? "border-slate-600 bg-slate-700 text-white" : "border-slate-200 bg-white text-slate-800"}`} />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className={`text-xs font-semibold mb-1 block ${modoOscuro ? "text-slate-400" : "text-slate-500"}`}>Vencimiento</label>
                    <input
                      placeholder="MM/AA"
                      value={datosPago.expiry}
                      onChange={e => setDatosPago(d => ({ ...d, expiry: formatearExpiry(e.target.value) }))}
                      inputMode="numeric"
                      maxLength={5}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all text-base ${modoOscuro ? "border-slate-600 bg-slate-700 text-white" : "border-slate-200 bg-white text-slate-800"}`}
                    />
                    {datosPago.expiry.length === 5 && (
                      <div className={`text-xs mt-1 font-semibold ${validarExpiry(datosPago.expiry) ? "text-green-600" : "text-red-500"}`}>
                        {validarExpiry(datosPago.expiry) ? "✅ Válida" : "❌ Fecha inválida"}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={`text-xs font-semibold mb-1 block ${modoOscuro ? "text-slate-400" : "text-slate-500"}`}>CVV</label>
                    <input
                      placeholder="•••"
                      type="password"
                      value={datosPago.cvv}
                      onChange={e => setDatosPago(d => ({ ...d, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                      inputMode="numeric"
                      maxLength={4}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all text-base ${modoOscuro ? "border-slate-600 bg-slate-700 text-white" : "border-slate-200 bg-white text-slate-800"}`}
                    />
                    {datosPago.cvv.length >= 3 && (
                      <div className={`text-xs mt-1 font-semibold ${validarCVV(datosPago.cvv) ? "text-green-600" : "text-red-500"}`}>
                        {validarCVV(datosPago.cvv) ? "✅ OK" : "❌ Inválido"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {metodoPago === "nequi" && (
              <div className={`mb-6 sm:mb-8 p-4 sm:p-5 rounded-2xl border-2 ${modoOscuro ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                <div className={`text-xs font-semibold mb-2 p-2 rounded-lg ${modoOscuro ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
                  🔒 Pago procesado por Mercado Pago. Serás redirigido para pagar con Nequi.
                </div>
                <label className={`text-xs font-semibold mb-1 block ${modoOscuro ? "text-slate-400" : "text-slate-500"}`}>Número de celular Nequi</label>
                <input placeholder="300 123 4567" value={datosPago.numeroCelular} onChange={e => setDatosPago(d => ({ ...d, numeroCelular: e.target.value.replace(/\D/g, "").slice(0, 10) }))} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all text-base ${modoOscuro ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-800"}`} />
              </div>
            )}

            {metodoPago === "efectivo" && (
              <div className={`mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl border-2 ${modoOscuro ? "bg-yellow-900/30 border-yellow-700" : "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"}`}>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl ${modoOscuro ? "bg-yellow-700" : "bg-yellow-200"}`}>💵</div>
                  <div>
                    <div className={`font-bold text-base sm:text-lg ${modoOscuro ? "text-yellow-300" : "text-yellow-800"}`}>Pago en efectivo</div>
                    <div className={`text-xs sm:text-sm mt-1 ${modoOscuro ? "text-yellow-400" : "text-yellow-600"}`}>{tipoEntrega === "domicilio" ? "Paga cuando recibas tu pedido en tu domicilio." : "Paga cuando recojas tu pedido en tienda."}</div>
                  </div>
                </div>
              </div>
            )}

            <div className={`mb-6 sm:mb-8 p-4 sm:p-5 rounded-2xl border-2 ${modoOscuro ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
              <div className="flex justify-between text-sm mb-2"><span>Subtotal</span><span>{fmtCOP(subtotal)}</span></div>
              <div className="flex justify-between text-sm mb-2"><span>Domicilio</span><span>{fmtCOP(costoDom)}</span></div>
              <div className={`flex justify-between font-bold text-lg border-t pt-2 ${modoOscuro ? "border-slate-600" : "border-slate-200"}`}><span>Total</span><span>{fmtCOP(totalConDom)}</span></div>
              <div className="flex justify-between text-xs text-slate-500 mt-1"><span>Entrega</span><span>{tipoEntrega === "domicilio" ? "🏍️ A domicilio" : "🏪 Recoger en tienda"}</span></div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 hover:scale-[1.02] min-h-[48px]" onClick={() => { setMostrarPago(false); setMetodoPago(""); }}>Cancelar</button>
              <button className={`flex-1 text-white py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 min-h-[48px] ${procesandoPago ? "bg-slate-400" : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 shadow-xl shadow-green-500/40 hover:shadow-green-500/60 hover:scale-[1.02]"}`} onClick={realizarPedido} disabled={procesandoPago}>
                {procesandoPago ? "Procesando..." : metodoPago === "efectivo" ? "Confirmar" : `Pagar ${fmtCOP(totalConDom)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {pedidoSeleccionado && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPedidoSeleccionado(null)}>
          <div className={`${bgCard} rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-violet-600">Pedido #{pedidoSeleccionado.id}</h2>
              <button onClick={() => setPedidoSeleccionado(null)} className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all ${modoOscuro ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-100 hover:bg-slate-200"}`}>✕</button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Estado</span><span className="font-bold">{estadoLabel[pedidoSeleccionado.estado] || pedidoSeleccionado.estado}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Fecha</span><span className="font-bold">{fmtFecha(pedidoSeleccionado.created_at)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Farmacia</span><span className="font-bold">{pedidoSeleccionado.pharmacies?.nombre || "N/A"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Dirección</span><span className="font-bold">{tipoEntrega === "recoger" ? (farmaciasList.find(f => f.id === farmaciaElegida)?.direccion || perfil?.direccion) : (perfil?.direccion || "No registrada")}</span></div>
              {pedidoSeleccionado.codigo_verificacion && pedidoSeleccionado.estado !== "entregado" && pedidoSeleccionado.estado !== "cancelado" && (
                <div className={`text-center py-3 rounded-xl ${modoOscuro ? "bg-violet-900/40" : "bg-violet-100"}`}>
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

            <div className={`border-t pt-3 ${modoOscuro ? "border-slate-600" : "border-slate-200"}`}>
              <div className="flex justify-between text-sm"><span>Domicilio</span><span>{fmtCOP(pedidoSeleccionado.costo_domicilio || 0)}</span></div>
              <div className="flex justify-between font-bold text-lg mt-1"><span>Total</span><span className="text-violet-600">{fmtCOP(pedidoSeleccionado.total)}</span></div>
            </div>
          </div>
        </div>
      )}

            {codigoEntrega && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`${bgCard} rounded-2xl p-6 max-w-sm text-center`}>
            <h2 className="text-xl font-bold mb-2">✅ Pedido Confirmado</h2>
            <p className="text-slate-500 mb-4">Tu código de entrega es:</p>
            <div className={`text-4xl font-bold mb-4 py-4 rounded-xl ${modoOscuro ? "text-green-400 bg-green-900/40" : "text-green-600 bg-green-50"}`}>{codigoEntrega}</div>
            <p className="text-slate-500 text-xs mb-4">Compártelo con el domiciliario cuando llegue tu pedido</p>
            <button 
              className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition-all"
              onClick={() => setCodigoEntrega("")}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );

}const VISA_IMG = 'data:image/png;base64,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';
const MC_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA5gAAAJYBAMAAAD1eVSOAAAALVBMVEXtGi0ANmP9tDHn5+b///8AAAD7qCXxTjfJyckFLlP+0qaXkIVuT1Xpfkn3l4cA3/qxAAAgAElEQVR42uydvW9U2xHADxS4wdKmiBDypdhbTLPeii1cpFsXPDnNU4KEBU2meE2EhFyEJl1AIlKaJ4UCKf+EkUkDkfYikIJYCrtIijz+l/hL6/txzpy5H+feOeuZh550bHax7s/zPXPW7F7I/P6F6DHio9EnoTD1qDD1qDD1qDAVph4Vph4Vph4Vph4VpsLUo8LUo8LUo8LU4xnMy6/MLr+kx4iPClNh6lFh6lFh6lFhKkw9Kkw9Kkw9Kkw9dgBTZSCZdQfz9HR/59XOqyspnvQY/Hh/d94JzNnuzvsvD1UGlX98fbVS0xYwd3c+6LOUIMsXrWHu/k0foxT5tw+mp1c2f3f+Nvtvfv6VymBy983rcwxPXsybN6dn889n7/FGH+fw8uZcqf4ybwpz9uCM5b4+SBny+pJmM5jnLNW+yrG2F5a2EczdU3+5ryyFKeeT3SYwZ389/UXQ5ydLN09pPm4Ac7anLAXKKZSj+jDPHKbaWIk0n8zqwpy9VJZSo6DHdWHuaU4iNwg6qgdz9k4dplyaj+vB3FMjK7kWdFQH5mmKqUZWuGqyYapiCo+BjmrAfKmKKV41uVtgD1Qxxasmtzk9U8UUr5qP5lyYnx/+qA9Mtmruz5gw9zTHlC4PH35iwnypiildfr1qnnhgzl5r+BOBavI0c0/DnxhCoE8cmDO1slHY2UcsmJ/VysZgZ59wYD7QWDYOO3vEgPkbtbJx2Nm/+2Gqy4ylbvCIAfOzWtk4nOa+H+aOJiaxOM0XXpiaZUbjND95t8B+UJcZi9P8nbc5/VKzzFhgPp77YL7T+CeasoEX5kXJQLVTtlZeREA+M/tA4594wtkjD8w9jX8iCmc9MH+rMOOJgH7vgfmDBrPxwHw0p2FqZhJROPvYA1Mzk9hyE4V5PWBqzySi3GTfEwC91jQzokTzBQ1TawbrA3OuMGOqGhyRW2BazYsK5guyOf3g4Y/6kCLSTIWpMFUUporCVOkA5o7CVM1UUZgqClNFYSpMFYWpojBVFKbCtG2BzRVmVDA9zWmFqTBVFKaKwlRRmApTRWGqKEwVhakwFabCVFGYKgpTRWFeS5jaz4wapjanFeYAslwuF8/MpWxsnB4H+Bm+vv9+kp7L9Pv7D0uFWVvuLpfGLn9efvm5n58hWb6/pFiU6ftlFgdMCbsmyXJhKNkw4Z9m8vV7SshUhIrK18ylYUlInsm3k9Qr018yhdkJynMJ9DCTtylTppnC7Ablmb39MiTK4XFKhlkT5Znc/jIkyqFxyoWZLEwTud3hw0z+lTaQSaYwO0F5jrOrn+Fb2lD+lynMPEvTRjp5lltpC/mgeeZKFqaddKCcH9NWMlHN7EItL+LalsqZnKRtJVOYzYJYWxGhzY/wlYAEq/9SPPufU34ZHubg/cyF6UZamNp/ujHyvjhQliKuOd0Vy+Y0SRMLbMpnXz+81jAT06U0+xGqUPDsDzZxnIfXGGa3LBvlKFs2lCzBwR2nKJhds2xA8ytb6bCorSggDJIEs3uWtWl+o/QNbRjR5zr/eC1hhmBZk+Y9B0rIO0/SvFoSlsk1hBmGZS2a9xrWBzzR0eTawQzFsgbNe/YsBJwpibTanhSY4ViyaW7RSSVQX/SEtpNrBTMkSybNLU4ZAB2xrM/Ubl8nmMYMTTOhdAwrKO066K7Ybl8fmIvAME0tluAxo8iqJ5S+d3xdYAZn6a/Tvk0b13nAb5R7quxJgBmepZfmRwsByH0FOGU9j0Zn/cPsv5+ZmD7kRp3Cz2U0A/4KbY2UJXxHbPjmdD8sySBoi7CRaLObULWtYKsAFRV6sv4wFz3BNPUD2TrtESIHxb5C2sFh9sbS7TbfFgFABQg400n0EYc+Q9qhp/MS05/c8AY/VicItH/EVQGB0fjM1lkz+2TpcJtbzGCmwaRB9Q2n6wxz0StMw3aYeB7GgAsl0ATLNSDoqRI0LMxRvyxtbvOtRwkddfVqpQBLHtUB/HhdYSamb7lBtL2Qa0uBb3wtxYZsTWEueodZdptJ6h0cuNI3bOg6i6+arCfMAViWDe3bNvHNxYuuCghINFx6MbQDwkzMEHKDmC1At4EEtmVFW6+zH0M7YJ5phpGfSSN7aVfB+R3fToITYQ9lveE0czQQzNuWcgG650OQDoOAuXfSi6EdDGZihpLMUV8H7+wdUi8At1OtvDTrCWZf/czFYDBXpYOTihEEVxKCruJts3rQdjCYgzSnh1PMlaH92KAnadG8UjsMSgEU9LhQNBRMM6Rktugn378Er6/0buMOUaMdCOZoUJi38ykmc/T1HBCQoQ45bVkapR6vD8zEDCs3KmOyuUeNxb3Mxn0UJNU4WxuYi4FhmmL0U+aD1O4eXZxFl2MtB0/b6wJzaMU8Vc17DYMfdE7QYk3dPVwTmIMrpjEnlpiUlTVaS7CWogP6gE7WA+bwimnMLVasCoXVTJbSgW8OHsPVgYaAaSTISVotzmDKq+Q5gxuXa7Wq6XQdYN4RAXPTl0cixwFCYfiAGAIDyzsfrwFMY+SoJjkYaUOG+XwFeRsKTg2PH+YdITA3CHVL7akmuGyu81YnOjQeRw/TSJGDysCAP3Dl1dPRV27HMKrZO8w7YmBu1BqiBO6NeVSIC2FVs/ctMGMEqmatcp3LCkOlMoTepCbu5vRIEMwNZ+CCxZgIywEpWpQYrX1RtKefEEQ1+4b5zAhWTSRLAYQGN9+WjxmmJMW8CmiZjpI3ZuDfWIFQXrPn6TwjSw6c9R/k0AH77UCsm4IwQBmoX80UUJV9lpdNonTqDlvcewzOiS90qvVxtDAXkoIev81E0vMhYWTBXQAqQZ3GCjORn47QlVZb2Q9XcwrgaEo7fnWw875mrzAF9DHJcHS1AA2EwUWyr8XQ8HB9zT5h3hXZxkQOhho3W9LlPIvnzKKEKSAvwaYphXWUoNl6X/mf244SpuAmZoOVW5sXhWohAfLvClZzkPUFs8M8cxRR+HNlV7FYvQPKc1ITX8Ry4DhCzZSWl+QiTmTukCCpm2Cfw/W/bXwwo8hLoFQbd+gTlmIZ3mQfuJqlh6FgButnSs1LvMEQOtokjfa/IGR20l9zWkBd/af/nMr3p6U/J8Rjhvo1dbAsIvlmcLPIYMrql9AKi/6SATjSFTr+cb16HBnMhVyYB3nfB6mrT401NqbLdXm7L8aOQ6C+YCZyWa6yT2SZWCzvAtmuvqzrYg+jgilYMct1IaK7Bb6akN+1ghX5dlQwJbM0NyuckONBoSk6S/sliwhmIhrmRupaN+FuhvH+MrhfdBwRTNFWtrSqQBIF90JtLpqF0sAP2lFCx6lmTzBls1x1xpBdeMe6nTFftppFA3MkHOaGPSlkVtMdk5VA2t8QqWY/MIVb2bydJRcPwGEk0RXwIhUIF74+jQXmXeksyxMIlRu9se4OA9JzXpZSUBYJzJF4mIbj/PjOERu8aBwJTAFW9r/PaXEUbWyDluVxAkitV1yis+IA1n9kGgBmgH5mIs6M1ow1q4qGRLEPeFoJ3U+P9NGcjmleBHK8sH6CQX/HXsntzs72AVOAlcUOHB16sg26QORfTprGAFOAld3oJK+vmFpXYxN8twFh0dBCR62THqbzBFjZm7Wj0FyzGTwjJR5bi+zLEcYRaKYAK3vSOOBxTKJbFYxalucAnUQAM34ry2t8MMa3sLBoVJFMPMxRLImJ49oBZFtoZIZXBbcLHd4oHB7mIqLEJHUk91C0psiY2UprXc6PncwbhIcpcfyuUfTKqA7ZUlRgjCF0NNcVHKaExOQ5S/5kSx3Bm48Cx65W63loi3WPhcOMoMheCJPoLqRrtBnZHytOetax8DzTxCO+GMZ3iwiQHhXo+h92UAQKrZlJRDAPrIN0wNQ4zjyC7xUtk5PQMEcRwbxFV8hT2w0wdq+JlcufwVrkrWStx93C7LifuYgIpiGTQmTEv/U+iNGi+9ttYQZtTsfE8qLqh7bZSUdxAVh782jzpg5TLBlmEhXMmzXaleCcuoMcQyCq+NaXZ4JhjqKCuem3kGSAg7wEJCUCrLFgmFG5zFymCfWLs55cEouxDzpeMBEM05jInCZYlQbI8WZM+SUDL3u5MJPIYDKa2EAMvTsMLTivKcHqGx+KhTmKDOYm0QErqilWYxuwpZj2qy4I5/oHsTDjGjKgVmzBayORbUxt6wqdfBRjWJgxtr/8n0rC+Ys1NuFLZSCpMKOdy0Pa0Ho/JAO9RXh0/v5kQmFGMzHCnPJg5Z+2z3Srs3d0LBRmdBMjpacLvvVKrOEpLeptffG2UJgyepQdGVlqOB2rk5pAOVJ0VIKwXdkgJMw1GGUnRl+BzBrrhEulq6RkboEJcJmbHZJkBLjeBAYY1aHDNjCDNacj2ktwrRSgdTLL172EvO0E+4SJe1JsLBJmnCWDWtoF7IEQ3yV72EEEFBKmgPjnp5ry9GmxZscig5aruqnfFXTHVu2cZsDpvNiq7HZdRk9j2V8fICY07StGmUDNjBPmTcZeLNhHJ8HWpkQyssVOI6CAMEdRwrxVJ5rFFoExOjtiY4EwF1HC3Cik/liKe4BJDOkE1DnL2S4CCgjTxCn+uBYrE5NoDWuBqASiq2TQZq49HMwkUpgn3HwFGBaYHItHx5JCqjC7Lc2Dc98AfVU5oj+G7jtO82qbiYM5ihTmLV4YA95RriY1/nYRULg8cxEpzM20+oEHmPtszQYVJe6HxWNgmM0105joIyDm6AeUNxDQPTWC1mmxknmeKMxgLVC0L5qQE+2MSRLi69K2wJJoYR64JiXrMLJ8A0upKrG7K605LSD+Yd5lUJYTMpfwm12gtjWrRhUsrbFDhdlRM5OXZkKFCpYaKFj73aHlJHQwmDEOc9ngobcod0EQqcVMP75OcpN1htl6mN2xg8kwtK4LhNHeIy1XEibCYEY6mecrm0NqXfujDSvYGmTUjN9UFkwBH5jQ4fWHPQq0CGdDwRSQmWy2NLL5KBRdIwTueo/bL4JlFrr0okwUTAHB7K1w6oP5uxHBOmTgDIBYo5mHCrOrzARcQQr/hcAY1APrOMr53z0WBTPqzMS5OgS8V6CzgotM/GNRMNcnmLVvq6eMm0utZ56mbyvMojxvLHQfmnMTCZYVFdJaSj1RmN3rNHqmz6tdLUb/DOw1pval9kAwk6hhHjBXFq5uW8O8RUaeE62MpOD/2Tuj1jaSJI6Hs0BgsPDbvuRlFdEPSg5EMiSLYYPxiAgGrA/RCfOgexFEYAjYn+E+gpCFAgNruG+Q/QZaVmA48CFYwUIg/gynkTTdVdVVPbIk+8Z7mYclK43Hcv+6qqur/tXaVgZ0T11gh38BmIoTBHjy6PlngWtul8mvo79uCPM+itOPG+bf7tJOtO5uRed0r+A3fvsOc4fpBuUPYLU3mlVbh9A/Fgjml0cN88AHZm1dlwIPUKLLVdj1qvuE+dP/I8zy2ukEo+Wi4j1RDrTmXHhRIMt88teCmbVv5rfPsu5X5a+q1Hyff4e5W7VlZkRxXK0OBslgUFXpP0Vb1Z7NJFH/KFH0lcEtDsynjxymRlZZTbK926ukmuHU6yXqlU+t57u+w9yh4CSjEOvLJryiQeZt1V03J5JRGycO8f5aVJgHt/gag/cq5L1vW3K4yB705y5SQCquN+k1xwkNTq1TBlFV7nviVl6ctdfiwCTbzH0yHH3w3oS8194SpnneSbz5ZdoGtMtyfr3UkoZL54bBjJ2a56oty9MPAnPPA3NI3jvdEuYse9DrHRS/iIs1F7Yi5abcNYpttbcpsGNMHj7vt8LsM/+JB7gkwyzTcWptCdNMjtH2MONnPMumWk8knbeOah7mxlmD+7FMkjPokbFogCWzKb+30RXsCqaqxvWmDPNO33LqhfvIYE5kYNRokQveZL8f7M4ytcSyKckQ8Lqo1wpy1QezysO6zItdwNxJPfOLsI6trjfyW1vDFF3h3Z3sUGIZaaaLVq0ljVdO2KRqEKbeJp93P8VpaR1zYQZ0oKbbwbRuW2/pZJXoZLE/RJC0/+w9bfK54KqxIdvzosKUg5wDZ6C6O4IZbqvn0qJhrvyhrwtI5XCFdRI3ZNMbdij8j2Hu7xrmvsd67maasmE231Vz+0acqFW+hY+/iwrTs/2gcW4zfLIrmPdnmMYfriHtcYMh+kOxELIVBeZTaR1zYDrxT7QlzB5NAOk4Vnf7T3p5DXM56mojPYl2rTkgIZt+XDBP5finvSuYx9tJutQwDyavHFCc9su7+dQwZFNbZdofAuaeCNONf9q7yuZtCbPjYdmkKXPPCbM428c6WyFkKwrMQ382zxJz45+7ZfPKZ9fX12cszD57+9m6+rzaOjCVMuWr2P16xuWV1VaUFrSZTAJIb5hpvxeYP/izeRam8w4yqPLN7dckSa6+8RHuwdfMSYf2lqG4Xy0vb4/yamznN9dzmI7/P5p/kgBtYdWivDJ/+egySQZEhBDjIqWCihO1XJdjNpuntiibPIRlTkSY7sJkMn0XX8F4Rm5xsvwHGezbLlqEr9Ka5mfudvywi8v5XzmfMatC6kWwmAjUZSTL8deJHfUUJCyqJFUATNXTMX11dJQMFiVLXQ9MFiOlOKe/KmSqZ/zudZOyyUPAnIkwXQ+28o6fqGVE16QGHfA/KizO+PZfuOzU4kN9WkXU2GVExrDi6uUKpqo75bGB0u7mMb05rg7tkrgAu5h+gwVNC7P6GGAOpf1HxYW59I6f3DdCZE/MDc2xu6XNnPa/ya2fmT1wy6zhLfKRIwVMbm6cCxPS7mxqHqksmLWbx/nNarFnXS2JMdjApjRtavYdDoB/LCbMQIK5xxPh3C8OaSrc+8wbK5i/y88qw3sPgtWEQlF2qFB/pq6nMBVb6oyUox6Y37zEt1oSO3A0Uh9cY7J56hHCnPBEmB0LAJ0S4GCHTHjcF+2860yLvlkPuniWDdgean4fmglKNMgWxTW7JMbEoEdaSdX0XcDcRT3ziz+bZ2AOBZj7PEyz1H5krYKx9aloxqcOTBP1tPEqH8X+jCrJJxD1QHOkOjah6yQJ56ZMYeqtYO6+OI1hGjtrD3EC1lJ+izHvCfu7vjQ7DJ6SC7Mc+Mx8H7wwNItn4JGIrIY88FbHAMyMX5rQdbULIx0Iv+hFIWGayd+aYZjWKv7ExleS6ogew1ymG3puCWbSlG+HMM0/+8iWI03qWnRRZFN9AGbdvqGqDHw8a3TBYZrxOp4hZwoM8ALDnEgjNZXDo2WwM3FgVoRHhTQ7ZR6Ld5kjXh7b8dY6lX3b+OMRjFyBAsV8oOq9W+ZPO4TZIDDNyEf72F7EJHdLXANXPnjmAJv5J4aBGVVsbDTxigr8MJcGZmPdjn1dceacgOUTaTafF9IyjVfsE5iG2eke3kvIeg2PE5660yASA2Mzb4xfbk/sDw2Jobn9zqrmLanYjUtYAzC5HwqdabP5gSMPANOM13SC5ARgi1dC2byynOLuyrbWdadBxGV/8QJsPlLbevpybvgDdoe8nzVvRyC+0b7kveMD/lEQmEJqdoxh2pVp2kO+siL/xX3ZbhmbbjN7XEJ/xlhsBY+wIm0lyrMzyX7EZR0JeQZBWLSRbuQBYJrx6vbQOFqj6c6Qr9yT/+JjEXXEZBva5GaUGOf88tI57DMjTE9SlydJqFjWkfYJUeyv0sWGaf4Gi2+MIEf2ljHZX4TuZhJnFK5uzm9uL7M4uEKNDHrZdhcn3I/Z7NTc+HuypkC5+ugwZOTuHExvvbvZfEm7dgsJMzDMesgoAksocFzf0bezVcbtfIgd5x7hs7xpWe2qgPvObv4zhqzaNKvb4mOtKXS9ytdSkCSruqVOSATEGOFJXPPDHFGdQiFhNnmYB8Cx4ZRpEF6hcvQfiEjPozEhWxzkdse0Ht7mY60unAGaPUqrWn3fjNJytOa6OEdQpJVdwQDnjKIkucwRFhVkn8mnZtt2UzHF8U8ZLXzlaCz1j6Q3zJjMu6M2OnbKMi0nUxzxKX1orZHUWlA7UrESWhlGTpfKUWrCHVIhpS3ZIyoPKqJlHlhvugdhgvjnAMN0GH3kYbZztXkTBvwMphTwIhsmt9/OIOATQe6q6uTgEZDycWEO0to2CnDTCqlW2Bmr7b926P5h2tSshdnH8U8lR5tXgTDtCLyR26b7tPjWZrSCXRI4v+3Sms1rylEzLQmaREQjkh8aLMCjmGig6QxglueCdIEJ2Tz7T7RdbNnXT/NauxDMhiy0nNLySoNpb+nibNJbt2Q+4sSTKqckRmCexE5/YFZVg845dI6fKUhxmhda9hHMChjnUo7QsgwNbOiRZc6wU63QTCxOLIxRNBUxkkHFHpqXD/M93nbSZO6IySNFmraLPRaYDTj/x3b4Gnnt0AhmW+6B7xIbC7mHTRG4PgNTr91+gGCqD472AC6ZVlzS8WX0iwhz0nRLSw04ZOCWRl47NNZadUXo3DaE88Uz1zDha5r7dgP+nJghNOeaY9xqyIVV2pdrKiJM4PoqINiEEscZo9liA2ICsyG545BiaQkwuQV4llv/gp2zS0WzjiFMYIbZI+Auc8RNAdQ2XViYwPUBmGWWzzSnTy8d8hkjy6LQI6oxavCuAoS7Y0YZeqKFntqMkD0yyCZr54skXkAdh8ra8ztnRS4izMCOPICJVHEB6zfPbr9eBotkSZOR0HHRL93iBFz8A6o44I6IExOCEyM0c+pWCjK5XN7+CpRHiM+lu5ATbVura2QXVHTLBK4PwCw1uSHtgs6QoVCBRhXKX7zZPJCPBwe6gd9c5vwwgikvk7GuJwFfAlOuo67x+52a86o2pl8QmF+4dSxC+QOYhynjmuRCgh6IcgJcIHvb5bJ5rfPrm/PrC39mew7TLsY/n8+v9Iduzkkhg292V4tGBaGeqR1HDeMfePTBMzk1W0SYB8D1HViYQ+7lzNeVZ56CMhHVwrYFY+5vFqNRz4EJ/D4cS5qoYTeX8oFPKT+yMdEQJmrDfCYngP5eQJgVsL7ZNC3yb042T2TZ5AodV25q9vOaMPeZsex4ChnGQmWWKcyO84SYT96DZntnyhQRJlzHDIdTFP/QbN5EruKz4gBT1bSbDjLt82FWZZjaPWVUdbxF5o47R3h5CHCzTqz1vIAwYVXKwiyxjrP1JEcCFPEduhlNAvODn+U8vP7I+D7eMnFXu08BgrJ5yn3oa6goqstb2iJaJhTelR1d48LWPqLCVdkzUG0B9s8kDu3myCGzX91jxpLA5M7Y90qzYDYvzISagu+2D0LJpkVCooiWCYV3FiaMf0hq9qNnoESN9BhvRbo5csjMzCeM72PGXa/ZaOIkgMwceS+UumqyZb7YAcxd1DMPheSZybGGSFWFqpBl30AdS01iLZLN0+vBNB/uhC0zv9TskS9+zaRiEKkaDxMfgljMxqFDqSoVcBtHXIXc8w1UQ4x2STZPr+FmYQXmHRsAvWTTed4VM/Wsdh9ywsBEmcGanJotIkxUlQpYJfKQ/R+jn7l0ylQVflJUMMw8y4Ste69ZmCeaPYq743xEkAqKEEymcAkPgbZ3vnQO2SsiTFSVCtjwdAhuIaKcqzO0VZmKbfAtaNTtJUy/6Dj12TY9wJ1/z/i+RfczniRHqd6yjmA6cwRYZohOGR46+YktO6d3r847ZEqRIQvzlGRv8b5jlasruQXMypCJc0v2qeXu/Jr4YfZB/mFathdOs7p1TBT+RNXFaU0ogWdvGDF91lAjpoRYSxeoc/qQFVpycWiDZG/RHZ+dE77kY4DQRGjR2vStcyVJ0gWp2TF7BEOo8rr5oux8kSbwrBoiUjSbxx8cPqo+gGVuBPMHqSo15JY6NntrN4/AzaLzS8lRQV1XsNBj6luC6k846UZxhx3WsGSSAH7NfVFJLDyzw76qCwXzKSu05GB2Ce+9pk/HgaHgMGgM7lsX5j4Lc8ZqAkwLGHSZI+1QQdo87jgL0EwP5oX7fQwFhLmPtogzLv6B2bwep6cLBAUXojl1BQulPJj8DTO3jix8p4I9iOQ9D1NXhQoYDWZDdwf0r+LB3PPCxCeEtATpnait3McwAwlmeCeYPVcyJ2xMRlXOxNwcHbZmbl6QQxDTX1hAmCW0RZxxSYASJyAB2q6yLJQdotiUChb2WC/KCUja0vG4TARkjTD8L3tX09pGmoSDEywwyKRzGYZRDu4VdfDHshiRCTmEQRJrEMT/YSqDDj4Jb1if/B9yzyV4hAZ8CDjnDcQ552CbMIYlCT4YBgY2v2HVLcn9flS9/ba6W6ke0oQZRmopjJ6ur6eeqrdPKAaQ5OiaJEe455KOnQoBM6Bm4Ckwrwz2tkbJKFd5CfttutAYmIZ7lbJp+Am3uNqoNHXZTpvYe9hBiqNTk6aEn+g3GTCxJDAf5gRTHxj4QJBw6i2rRPqjIPaST0fH79VNQ1w1OF1eM73DbRTrgTExBIrHVGDRUGnagrAmqZpt2S+iZMu81qzlA9HRUvOWFSpkfuANrKaCuWqpTxzadz2z2mF3/R2httCAkFHqHa62Sc2i2VpNAqlBHBoCwEAKmANmYOAZ1dFqUZ3/J1RgPHOAqTwJuzYqZySYjMmrwaCj1QyA7b47/4lQGdqCsKdEHFaLzweFnFNc9llgekL5zCTUtFvUbZK7lCsd+IH5xH4MdtzzSC/5nfI9ZRKzj8M2EmAqsGyru2aPKCOcfcyats4tNCjpkJq3xAw8AeaZOVNAgfmsy1cYKyqYt60Ied3lTXNVZfOuHEd3bEM/wbL7TwJMFaojlQAiJX8zRZfWSLPB3JAHpk7NGmB2rJmC23YCVKM4IaIkHBBHmtzuslFztaUJLfvjRGfyB7FvDrFHWyiiiZLIf45Q843gnIGnwexGHCDoB61CsqZ/qjSRA+ZzZmDgDpH/qLf8yzala+3+GruWeGDx7LqJPTZWvHdukUJLapds5zh+OW5ajuwOmeYvgSBcMdT3BvUA+/3jrg1mPzx+dJTv/MwSwLzLDAzcId18SJEAABTBSURBVPIfNdQppvSjvV09WjXSU8/FWKE1ILvk2uLHestF8wMGmIQspHNjVWpyBNGxFuvdFDCt5+MRmHJ4ZSx+yhHKAfM7e2CAAPOldcuKEVB1aftODFiyV6auA31thMCBuTd/egBD7b+zJ4NsSzlXVna1zZTbkVfUsIyS36daBw1CD6XgROmJw170aEzEKmtiwGxQQktL4HNmbQjRpFqvvvxpSQMmgPW+fDqoHXxu6UArPcM/osmjJ+bD0+0df/ny56+JmROq2ZQzbbt69NMEI7Pk5pekce31fHRvDtfoRJF5fdJFFQjmM8YKleRUFVqudlPkXEPP9zqtyXEITgXQNcuM/o03IWiloAK0fNIDzGFkk4Ct0ZzHmpQN5gcdzBU7/9EIv3qKzoPfRHtmv/cP59TKjy4wkf/Vncf3OcB0PgOTrbbdaPRku9+M/+tEDJgBs8tlxRbB0sJa8rriN9H2iDV4L/lzGAxTtoRbLGJpYJpsXrLU1Bk0Jyq+DjR7xy1Yjx+CU3lg6mye7kZfErc4f6kz3nJ3CDCv6K2VRL/NBnOPBcudyrRt1Syknno8le3u9bD5oN+EPalgthxgDggtplNQN+Bj6hUB5hl3zpRl5m17/HLIgrWXYmJJUNUF8a6PxVFyr41P22ELMF56EMgB861JZdtVfM+sBW+l6dl5r7lLbRsdOJf3q2CO+vr1O2uabXQv536gHzbk47k1MHutI8QoCwZ5YNYM5Fbt/MfYaEn8nw6T7PcO7zMt2DoD54DgmXbYkMHAW0pnpQ9CoaIJZWnClXg8erq+dhwrf2k3R1HsnI/NKwvMu/T6j7opGbFusdPP3esE7Q8OwzQ/2nOdNaWDeWaDyQyUjEh+qDck5Vwjrdtsf+F2S6OKopjZHptnHDM3CwGzkH6mD5hX9pg8mX5eXVMkj4t9MGj5ayYAr7CttTo7RA/kQN9o6GTzJjJNKwXqmPracTbbHgfMpxGYa3OCWUJzegamuculZuc/5i1Dy+qGCdot3slaDnWXP7/TbNGYzZhlbgVFj5wu6yWelxU2E6Z5hAad2BpFtQw0t4WB2aA3MxP9LPOWFSvyDRO0SSx/o0HbYUcZppwBr8Rc4qqJEUkAjJLcF601BSyl10t2Q095v2a0zRQw/lvOBYEZGPHqJ+tc4iekFtM8ubSjyGF/Ij2msjpGl7irWY21VmjXKXjfn+0CaZm2RKF8lBAJFgGE7LqZHqB5dPh6nFYP5y4zS1LnzcB8ZiJl8T/W8mZ9Od6VYs3RDZ9Nl/lYTV5WhxTGk4Vf2qdeaScXWXKvi9mvH6pdx97RTHKAag40flUF01bNKoCuKwETE0Z+1hgddo7CXyePTCDJMgcUm6eCeUUTfloPszdQXfPkhkPllPjOK3M1/7ST8uh/tlzo86yFOHtzyAqEEj0shsfT2x4dhX0ClU58bvSQJ4C043BvPhdPHJn62snS9u1+KA3Mt7dyXPU4yD36g3v/4ODT+LocMG8O2M+NP3VgvXhp3aetVetj+PdI0IHaTPz6BLNj6Os72EIg9iBo54+34nPgZ/tNoyuxXzw+npj/higw797KdzkgKf2quTY+zzxwP1w/miy2jFHB/vjPbHFp/F8YktstJhzT9KWp7Eh/dObVGcgF82tedX6vvpbPYDjPBT6bwtdEgdmoMJjLrv3PvkvbHcv5w29gZveWl5eHhweX+p+D+N/mq5eHynVwoWQsTl/rY4bKthJ0w6t+64koMAMBYIY5L6u0wEwGCG7w0V74nmuer8Q6UwCYt8ICLveBJpDdZtHr5kCWZb79+mBiWNiFFGhoIkIMzStdE9bqUQ3HcX60JQzM518fzP2i8DMmYcF60chQkTE7oJwq9chtFgRmMf1MEbXJUljoBe78FOwnAXw+R33J/GCW0ZwWkc4u57VLTBJQcNw3X7EChVcmf2kwa2FZF/i8B+aBC+ZHkxvQKGBPhIFZ6doEPSkDtPACDl/I8PfMmcyWCGbV01niuCjdwNBZxThO20QqvmrR9RuY9nVRpEMFl0FBlsBJfwfmm5ouF0wB6WztYI7rMCNjR4KLRk7LmjP5bWviwKwq1b5MmhsQsIHNytGvOFgE0P8ezJPMlghmUFEwl3zKQnVnjycbn4HpO/0GZlmBFjTyDUkjZRlzhuIDJxcfyAPzbTXBRM6xom/g9K1CgHoD52ZmSwWzmmKDmgdymG6Q5Beg62sxLzNbKpiNiuc/jp5HWtkPJkELji6pFVbXvoFZAjuPTiYBLD8JDOGeYuRmkXoiEMxqZkD7Jh5AUHjZFD9gWTlytAHkSWbLmgKrbgaEVBqDBgsHHpEP5yxQ5puzLbc5XdEMqMaZGfBmBxxTAF4+1vz7Nr+BWahm1ofDQSdcSJaqLo0X5mxmlgxmo6Ihk4qW6JG9AkvNMg1NmlI4KQ3MhznAlNDS7Ge8MIt6GaimZUaFiF0BBSIts9otTXSEQMwobTe/Bxw3bAgF864st5m3o8VJBjBFRcQpf6BI/U/pYFZX1AWesvQbhg7cwyhpNahyw7lQMP8KMwrzzQMBZ6g24acQSfkog7LBrHTQBEopAry/5NJWzPQobAVSwayorB3odma6AaIX0YB8NpuHMigbTAFBcyln0KQDKSueDMHH0WLh+ufy60wJYNbz4Yjp2nVwtCrBFgq5BvvyhcySLbOCg32QaYqIcrQuxNNpg0AumAIqzd8z8D/GTw+eaS24B0nQS2WCuUNmeVNgk+u7arPstgOFVIrdL/3h7lrLCWZpzenKNag9VQapyADH3d78A3U2KfmaU8lgVqpBfRFSg1oEklbaksLxoW+43gokg/m8QljW0pRWepML04h5i3lId82bosFsVCxkZvrpvWj4VDGeolfIQ8wuAMwqBc390DlaYue44FU+OosZ1JPmU9lgVihoIoUHsmI6FnTd2AgdJnIc4UYgG8y7FQuZueb53CMN6WnQmnAwqxM0lz1qfEyyH2CmoTEDjGiQ+SfCwaxO0CxgzjqlR5IqEQqkg1mZoGmp8EzrA7oIhVS+NYUExGIKk0WAWZWgWXeQcilpK4TOWOnaUaHdeC4eTAl+1meXwT43N0noCMCXkwXvorMAL7sIMCumHXGV/oSQBFRTA/cQp4tTgNyFyULAFOBnl3KmL4yVgcdzMcMQ0y3058LBLLafKaQ4qXlbpef4ngeAGeIvFkH/lN+crqxGD7S0E/QXUVMUsCsM0Pn15phgfi+7EDAr7WeN2Bg6GpjANcj8RHtrlQCzYrIunOd98PTLyDvm09LBfFgAmBKKE5zbyWYfZCD7mximbCTJ72UXYpkS/Oy+r00iXfyjhjBwqo+UyhIY54uFeNnFgFkdP4t+euZcgRYt3rCYXHZBYFb5XAwkuALktSQmkuD78BTgZRcEpgA/e2ifMpT8+bcfHwCp4iBXzotO1V/sZRtvPn0UD6b0pua+igO6WplMteEQh4Bfnhz9TD+EH9+/3pAOpvSmJtePhjkqGXQUnAYLYQ5/xc3pd5vSwZTdB6sb7RDIqlKfJznSWd8IxnsTGMPSwHxYDJiy/ewFDxcoKCNNyTHJK1DIAUPrRQB+/3qiGnl3LtwyResNavbP7M5E0a4SkY2lXtY88bLjoDlOgO5tSgdTsp9dpn58oKXKZlsE/El2dLDvUZHZ2Azu/xy8i/4tcwqsEikQFhkRtecBWLRRk47EGewPm8EPYzBPg40cYJbdnJbuZ+spHLiWovpuAcpG9cZF5ouPwYuNN2OzlA+m3BRon8ta3HCBne+gi3h3CaODqWXe3xwbZrAlHsxAdPrD/urgJQRyHRaV9lzgTGIZx8z744x2Uz6YUlOgJUqLh8zQkM+YO6Q7WSCPC98I7q2NkWxUAMxAevqTunwgRWYJJHxoZLNg15izGHkRNE6D9xGi8sEUkALtA7OT1F1tgCN0or88jPvMjCS4NyUNTisAZhW6mn5qHY0mIB1pJmHD7Ad6EZtoY/5R+AWCWalDGHEeZID31MArrBOv+vp89g/5YApIgZZT4x2GIXnyAbKdLqZllrIJPCFtb7zq943w4/uLHNNDiwRTuLALHOoOVGIgMqUopnwp0ApMFbzGm63/BBUBU7Bp8uey4XztMGTsEChatqBroWBK1QJlVW6hmwMAvRhxPBRYjPbn64ApoTqZu4+MTt4VPeIkJRI7qSyY4meIwF0gup2sX1WpX0Ua5iKmwKRXJ0BOGAC9YwK8FJROTZeWQJ0XDOZCmtMSiYO+h/WgysoiSx2gpR3RRV3coN9WUGEwRbU166l25Bz6yjZaRMN5XmkwJbU1L8yiMcviO/IN0PkGcA/kYsGGuSh1nkTTXE7PTzxPqYX/t3fuvG0cQRyPG6u5ZlMEEMSKxTakq2MAGSnvCgd2EzgHyJCqbdOkyheIXCUNEagg8iksyIAB04BpxHACnQqxlfVdoiNFPXj7JLm3s6f/VBpLMhb708zOzmPpkIbn/gyzccskZJpTzSCBUL/qvejLss3Ycumwn9j8iRkAJhnTfGycEbrrOLk2TWCYUFDFP+fRw6RimsKm8miKc7g0wa6e3eT+QtkgMImY5mOlMVpEsbUuIMc2rs0nf0LBZKQMk9eiGKGf3nMPcxTRUo+1ASaF1q7frDI4hjkibjhw9VHSm1bAJD9ILTRjlzf5PKcn3CVdm/3txmHu+oAZPgaafKsHKRQjBRYpd67uPbj3/0xYOywzeAyUMDa9E5CKxc3S8lTkDj8jFL/XZ22BGdo0J9XIuQGIqLcCcWVGQCzdVYSxY4E1AdNrPZNIDJTM2lPXS+GtNjR2w/rcE8wGi9NEYqDhzDsYXyvUDpwIi3Yurnz1osfaBDOko3103UCuqSULZa/H7dClsKxziftRlfBzLQkJM2AMlCyWMO3WZ7j4Wl7Udh6zz9oFsxMy+pnLjs5JirqjFdrsLHf4E2AtgxmMZnK7hE+mUEfY2iFXPVSyBJt3/TnZkDBDOdq7S5g6Aqz3MtskEpaNt8/aB5OFdbLXjlbIOuf4/XiUG9wnV05zSqspkzbC7IR1srrLpsbxClMN1HRqnrM2wgzhaJetYmpfw+LGtwmWPnxK/qs91k6YLDjLKnWg/fSYruUb38L4He7byYaG2QnrZCv5bql8yQ1PTdSae0Tts4eWf/venNEb1laYDedot2RLOK7hsroqCr1TFgqD7bP2wmz22JR6uI7QZWRF7cVKoT1YhWLij3vq4SIFs0lH+0i+BGMxrN5MyZ3bhPwfmKzxKbCQNBPVEs7up+vE+hUvrnDc58w3zADF6SCOVr2EY7cRaWFu8JGYM/d8YJKA2RRNnYeb6h9u6upaQES3K49m/Q7WEoXJQh6Yt7fNWgQjNC9NGNt/uKTXchIa5m4DMDshD0xFEFT7oCdZ9cPQmCeaDH6oWGYDNBPTEs661p9A4vQq7W1s9YY9DJjeaSbmJXzSvggk3MJbyXe+socC03cQZOPhjk1khCL7LmwyCX32cGD6pWl3Wk3N+Z2u1QeBS/6xEZZkYPqkaRl5dKb1EIdLglqhbs0TS3n6Rc2zxx4WTH80raPIztQyvS4kDbVcM5fSEEtCMH3RdLgRdKbyfM6an3fSZ0MaMHebg+mHptPtrmOa75KYKTddZXqNbSAhy/RC0/GmrvK03CppK+0s6LOHCXPzNJ2zLguavPYp7tw8884lb0h/ZQFhNlzP9EtzlQzasTEA4vIJQCEz2zFrFmbQ4vSylKFZWvS522f8GsjHUoa5wcxesuoSzqw7egzh7pNmWdKDuTGayepL2JE4VVGvpgjDiyK9hneOIMwNHZzrGMV2Z6p/2Ul0lc/q8SChD12YGzg4kzUdXOfMYRaMy7xyb8IAc76Xaxpnuf4STt0eNVj2tuMAu0YUJmNfApql5I7C61Vp3bN7IcySMMw14qByU0vYcR+8DWiWlGGuenImm1zCmcX1stYBdhFqwyjDXAVnsmH/Ng+EuHRKU+5ix5NtwJTfEdxwJkMP7v7UxdOOJwF3izhMJ+ssh56WcGo7EDYOu1X0YV7h/BjAvy4t4VjeMnL3QvLLJPRGxQDTbJ5J6X8Jp5caJ/vksiSwS+GnwKzPLoWBfiwbs4iy/CBJ8z25GE9obBGx4rR5O8uPv27Np6C3rpT/Js3/TZXvP1zOMV5evC8rixwywFxDRiH3b3T75ZDWtsQJE7ISzF3AbA9MWCZgQgATApgQwARMCGBCcM+EwDIBEzBbB5NkPRNiCzOC4jQEMAETMAETApgQwIQAJmBikwATApgQwIQAJmBCABPSOEzUM6OGieI0YEIAEwKYkA3A3C1eYZPigXlosEzAbA3MFDDjkSMTzCPAjAjmQAtz8LnAJkUD81Wuh/kWMKOR4gAwHw7M18UQuxQLzD09zPQpYMYi28VLA8wXxU/YpliumT/n2imw/DlgxgPzn1RbnM4zZA3igXligJkfIZyNJ2dggom7STw3k8wEc3432cZe0Ye5b4T5IyKgWI7Ml6kJ5nNEQFEFs1qYeYFDM5L459AMc143waFJP/5JzTC/x6EZg2xfxz96mC9waMZxZP5lATPDoRmFl53nfwww87conMSTMjDBxKEZhZfds4L5DH42hovJSVqDuVzPrL7+DD9LP5Yt8jvIFMXp6uvXiGfpe9l9O5gp/GwMsezADuaVn0UIRNzLHmS2MJ/Cz1IPf/ZsYVZ+FiEQ7fDnMLWFiRCIumHuZ9YwK9PEqUnZME9Se5gwTfKG6QATpkndMB1g5q8RA9G9Y84qmQ4wr0wTjpaok52nZR1g5k/haKk62Xm9xAVm/haOlibLg0HqDPPK0YImwQOzOMlUMCX1zGt18GeBhDtBlv8qkWlgppWjhW1SY3lT+nKDmWYVzRG2kNB5WRwcpqvBTJ9VNHFDoXMnKQ5+z1aFOZh5WhgnBRkVM7vM0lVhXqlVFFTxHA0hwWQ0OppR+HuQpevAzH/4XEBIyKt3uYKRNcw8+wM4KaB8n+bp2jArnOURdjOonL4b6BlZw7zRrX4Yaij1G8sfzGayUDOoIdRNwYTaIsuECphQARPqajDV9UyosamACZhQARMqYEIFTMCECphQARMqYEIFTMCECphQARMqYEKt1P8BLOyfVgySGxcAAAAASUVORK5CYII=';
