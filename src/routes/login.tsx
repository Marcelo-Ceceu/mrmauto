import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogoIcon } from "@/components/LogoIcon";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn, FadeInStagger } from "@/components/ui/fade-in";
import { motion } from "framer-motion";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — MRM AUTOMÓVEIS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Bem-vindo de volta!");
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-primary text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 2 }}
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <FadeIn direction="right" delay={0.1}>
          <div className="relative z-10 flex items-center gap-3">
            <LogoIcon className="h-10 w-10 rounded-lg shadow-elegant" />
            <span className="font-display text-xl font-semibold">MRM AUTOMÓVEIS</span>
          </div>
        </FadeIn>

        <div className="relative z-10 space-y-4">
          <FadeIn direction="up" delay={0.3} distance={40}>
            <h1 className="font-display text-5xl font-bold leading-tight">
              Gestão completa
              <br />
              de compra e venda
              <br />
              <span className="text-gold">de veículos.</span>
            </h1>
          </FadeIn>
          <FadeIn direction="up" delay={0.5}>
            <p className="text-primary-foreground/80 text-lg max-w-md">
              Controle custos, calcule margens e acompanhe seu fluxo de caixa em um só lugar.
            </p>
          </FadeIn>
        </div>

        <FadeIn
          direction="up"
          delay={0.7}
          className="relative z-10 text-sm text-primary-foreground/60"
        >
          © {new Date().getFullYear()} MRM AUTOMÓVEIS
        </FadeIn>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <FadeInStagger className="w-full max-w-md space-y-8">
          <FadeIn direction="down" className="lg:hidden flex items-center gap-3 justify-center">
            <LogoIcon className="h-10 w-10 rounded-lg shadow-elegant" />
            <span className="font-display text-xl font-semibold">MRM AUTOMÓVEIS</span>
          </FadeIn>

          <FadeIn direction="up">
            <h2 className="font-display text-3xl font-bold">Acesso Restrito</h2>
            <p className="text-muted-foreground mt-2">
              Área exclusiva da equipe MRM. Novos acessos somente por convite do administrador.
            </p>
          </FadeIn>

          <form onSubmit={handleSignIn} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-primary shadow-elegant"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-4 border-dashed"
              onClick={async () => {
                setLoading(true);
                const { data, error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                    data: { full_name: "Admin", is_admin: true },
                  },
                });
                setLoading(false);
                if (error) {
                  toast.error("Erro ao criar: " + error.message);
                } else {
                  toast.success(
                    "Conta de teste criada! Se o email não precisar de verificação, você já pode fazer login.",
                  );
                }
              }}
              disabled={loading || !email || !password}
            >
              Forçar Criação de Conta (Recuperação)
            </Button>
          </form>
        </FadeInStagger>
      </div>
    </div>
  );
}
