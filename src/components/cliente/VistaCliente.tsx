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
    const limpiar = celular.replace(/\D/g, "");
    return limpiar.length >= 10 && limpiar.length <= 15;
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
                  <div className={`mt-3 p-3 rounded-xl border ${modoOscuro ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200"}`}>
                    <div className={`text-xs font-semibold mb-1 ${modoOscuro ? "text-green-300" : "text-green-700"}`}>Recoger en:</div>
                    <div className={`text-sm ${modoOscuro ? "text-green-400" : "text-green-600"}`}>📍 {farmaciasList.find(f => f.id === farmaciaElegida)?.direccion || "Farmacia seleccionada"}</div>
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
                          <span className="text-green-500">{info.tipo === "Visa" ? <img src="/Visa.png" className="h-5 inline" alt="Visa" /> : info.tipo === "Mastercard" ? <img src="/Mastercard.png" className="h-5 inline" alt="Mastercard" /> : "✅"}</span>
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
                <input placeholder="300 123 4567" value={datosPago.numeroCelular} onChange={e => setDatosPago(d => ({ ...d, numeroCelular: e.target.value }))} className={`w-full px-4 py-3 border-2 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all text-base ${modoOscuro ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-800"}`} />
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
}