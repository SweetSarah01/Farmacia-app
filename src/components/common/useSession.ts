import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export function useSession() {
  const [session, setSession] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

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
    
    supabase.from("profiles").select("*").eq("id", session.user.id).single()
      .then(({ data, error }: any) => {
        console.log("Profile query:", data, error);
        if (data) {
          setPerfil(data);
        } else {
          // Perfil no existe, crearlo
          console.log("Creating profile for user:", session.user.id, session.user.email);
          supabase.from("profiles").insert({
            id: session.user.id,
            email: session.user.email,
            nombre_usuario: session.user.user_metadata?.nombre_usuario || session.user.email?.split("@")[0],
            nombre: session.user.user_metadata?.nombre || session.user.email?.split("@")[0],
            telefono: session.user.user_metadata?.telefono || "",
            direccion: session.user.user_metadata?.direccion || "",
            rol: "cliente"
          }).select().single()
          .then(({ data: nuevoPerfil, error: err }: any) => {
            console.log("Profile created:", nuevoPerfil, err);
            setPerfil(nuevoPerfil);
          });
        }
        setCargando(false);
      });
  }, [session]);

  return { session, perfil, setPerfil, cargando };
}