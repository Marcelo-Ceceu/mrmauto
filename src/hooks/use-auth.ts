import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchProfile = async (userId: string, email?: string) => {
      // Garantia de segurança: o e-mail do dono sempre será administrador
      if (email === "marcelowilkeralves@gmail.com") {
        setIsAdmin(true);
        return;
      }
      
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).single();
      setIsAdmin(data?.is_admin ?? false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id, s.user.email);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchProfile(data.session.user.id, data.session.user.email);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading, isAdmin };
}
