import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Car,
  LayoutDashboard,
  Wallet,
  Plus,
  LogOut,
  Menu,
  X,
  Settings,
  Users,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Shield,
} from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

const mainNavItems = [
  { id: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "estoque", to: "/vehicles", label: "Estoque", icon: Car },
  { id: "vendas", to: "/leads", label: "Vendas", icon: TrendingUp },
  { id: "financeiro", to: "/finance", label: "Financeiro", icon: Wallet },
  { id: "clientes", to: "/leads", label: "Clientes", icon: Users },
  { id: "relatorios", to: "/finance", label: "Relatórios", icon: BarChart3 },
] as const;

const secondaryNavItems = [
  { id: "equipe", to: "/team", label: "Equipe", icon: Shield },
  { id: "configuracoes", to: "/settings", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const isItemActive = (item: (typeof mainNavItems)[number] | (typeof secondaryNavItems)[number]) => {
    if (item.id === "dashboard") {
      return path === "/dashboard";
    }
    if (item.id === "estoque") {
      return path === "/vehicles" || path.startsWith("/vehicles/");
    }
    if (item.id === "vendas") {
      return path === "/leads";
    }
    if (item.id === "financeiro") {
      return path === "/finance";
    }
    if (item.id === "clientes") {
      return false; // Subitem do menu compartilhado com leads
    }
    if (item.id === "relatorios") {
      return false; // Subitem compartilhado com finance
    }
    if (item.id === "equipe") {
      return path.startsWith("/team");
    }
    if (item.id === "configuracoes") {
      return path.startsWith("/settings");
    }
    return false;
  };

  const NavLinks = () => (
    <div className="space-y-6">
      <div className="space-y-1">
        <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Menu Principal
        </span>
        {mainNavItems.map((item) => {
          const active = isItemActive(item);
          return (
            <Link
              key={item.id}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all group relative",
                active
                  ? "bg-red-600/15 text-white border-l-4 border-red-600 pl-3.5 shadow-sm"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white pl-4",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 transition-transform group-hover:scale-110",
                  active ? "text-red-500" : "text-zinc-400 group-hover:text-white",
                )}
              />
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="space-y-1 pt-4 border-t border-zinc-800/80">
        <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Sistema
        </span>
        {secondaryNavItems.map((item) => {
          const active = isItemActive(item);
          return (
            <Link
              key={item.id}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all group",
                active
                  ? "bg-red-600/15 text-white border-l-4 border-red-600 pl-3.5 shadow-sm"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white pl-4",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 transition-transform group-hover:scale-110",
                  active ? "text-red-500" : "text-zinc-400 group-hover:text-white",
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0d11] text-zinc-100 flex font-sans antialiased">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-[#0e1117] text-zinc-200 flex-col border-r border-zinc-800/80 shrink-0">
        <Link to="/" className="p-6 flex items-center gap-3 group">
          <LogoIcon className="h-9 w-9 rounded-xl shadow-md border border-zinc-700 group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="font-display text-lg font-black tracking-tight text-white leading-none">
              MRM <span className="text-red-600">AUTOMÓVEIS</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
              Painel de Gestão
            </span>
          </div>
        </Link>

        <div className="px-4 mb-4">
          <Link to="/vehicles/new">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-600/25 rounded-xl h-11 transition-all hover:scale-[1.02]">
              <Plus className="h-4 w-4 mr-2" /> Novo veículo
            </Button>
          </Link>
        </div>

        <div className="px-3 flex-1 overflow-y-auto custom-scrollbar">
          <NavLinks />
        </div>

        {/* Rodapé Usuário */}
        <div className="p-4 border-t border-zinc-800/80 bg-[#0a0c10]">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-9 w-9 rounded-xl bg-red-600/15 border border-red-600/30 flex items-center justify-center text-xs font-bold text-red-500 uppercase">
              {user?.email?.charAt(0) || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-zinc-200 truncate">
                {user?.email ? user.email.split("@")[0] : "Operador"}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email || "online"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-xs h-9"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sair do painel
          </Button>
        </div>
      </aside>

      {/* Drawer Mobile */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-[#0e1117] text-zinc-100 p-5 flex flex-col shadow-2xl border-r border-zinc-800"
            >
              <div className="flex items-center justify-between mb-6">
                <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
                  <LogoIcon className="h-8 w-8 rounded-lg" />
                  <span className="font-display text-base font-black text-white">
                    MRM <span className="text-red-600">AUTOMÓVEIS</span>
                  </span>
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <Link to="/vehicles/new" onClick={() => setOpen(false)}>
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold mb-5 shadow-lg shadow-red-600/25 h-11 rounded-xl">
                  <Plus className="h-4 w-4 mr-2" /> Novo veículo
                </Button>
              </Link>

              <div className="flex-1 overflow-y-auto">
                <NavLinks />
              </div>

              <div className="mt-auto pt-4 border-t border-zinc-800">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </Button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0b0d11]">
        <header className="lg:hidden h-14 border-b border-zinc-800/80 flex items-center px-4 gap-3 bg-[#0e1117]">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg bg-zinc-800/60 text-zinc-300 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="font-display font-black text-white text-base">
            MRM <span className="text-red-600">AUTOMÓVEIS</span>
          </Link>
        </header>
        <main className="flex-1 overflow-auto bg-[#0b0d11]">{children}</main>
      </div>
    </div>
  );
}
