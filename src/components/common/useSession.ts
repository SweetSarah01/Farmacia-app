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
      if (!session) setCargando(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setPerfil(null);
      processedRef.current.clear();
      return;
    }

    const userId = session.user.id;
    if (processedRef.current.has(userId)) return;
    processedRef.current.add(userId);

    setCargando(true);
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
      .then(({ data, error }: any) => {
        if (data) {
          setPerfil(data);
        }
        setCargando(false);
      });
  }, [session]);

  return { session, perfil, setPerfil, cargando };
}