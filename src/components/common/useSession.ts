import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";

export function useSession() {
  const [session, setSession] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setPerfil(null);
      setCargando(false);
      return;
    }

    const userId = session.user.id;
    if (processedRef.current.has(userId)) return;
    processedRef.current.add(userId);

    supabase.from("profiles").select("*").eq("id", userId).single()
      .then(({ data, error }: any) => {
        if (data) {
          setPerfil(data);
          setCargando(false);
        } else {
          supabase.from("profiles").insert({
            id: userId,
            email: session.user.email,
            nombre_usuario: session.user.user_metadata?.nombre_usuario || session.user.email?.split("@")[0],
            nombre: session.user.user_metadata?.nombre || session.user.email?.split("@")[0],
            documento: session.user.user_metadata?.documento || "",
            telefono: session.user.user_metadata?.telefono || "",
            direccion: session.user.user_metadata?.direccion || "",
            ciudad: session.user.user_metadata?.ciudad || "",
            rol: "cliente"
          }).select().single()
          .then(({ data: nuevoPerfil, error: err }: any) => {
            if (err) console.warn("Error creando perfil:", err.message);
            setPerfil(nuevoPerfil);
            setCargando(false);
          });
        }
      });
  }, [session]);

  return { session, perfil, setPerfil, cargando };
}