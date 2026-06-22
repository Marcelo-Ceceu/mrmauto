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
} from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, FadeInStagger } from "./ui/fade-in";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vehicles", label: "Veículos", icon: Car },
  { to: "/leads", label: "Leads", icon: MessageSquare },
  { to: "/finance", label: "Financeiro", icon: Wallet },
  { to: "/team", label: "Equipe", icon: Users },
  { to: "/settings", label: "Configurações", icon: Settings },
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

  const NavLinks = () => (
    <FadeInStagger className="space-y-1">
      {navItems.map((item) => {
        const active = path === item.to || path.startsWith(item.to + "/");
        return (
          <FadeIn key={item.to} direction="right" distance={10}>
            <Link
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-1",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 transition-transform group-hover:scale-110",
                  active ? "text-sidebar-primary" : "",
                )}
              />
              {item.label}
              {active && (
                <motion.div
                  layoutId="active-nav"
                  className="ml-auto w-1 h-4 bg-sidebar-primary rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          </FadeIn>
        );
      })}
    </FadeInStagger>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 bg-sidebar/95 backdrop-blur-xl text-sidebar-foreground flex-col border-r border-sidebar-border/50">
        <Link to="/" className="p-6 flex items-center gap-3">
          <LogoIcon className="h-9 w-9 rounded-xl shadow-lg" />
          <span className="font-display text-xl font-bold tracking-tight">
            MRM <span className="text-red-600">AUTOMÓVEIS</span>
          </span>
        </Link>

        <div className="px-4 mb-6">
          <Link to="/vehicles/new">
            <Button className="w-full bg-gradient-primary text-white hover:opacity-90 shadow-lg rounded-xl h-11">
              <Plus className="h-4 w-4 mr-2" /> Novo veículo
            </Button>
          </Link>
        </div>

        <div className="px-4 flex-1 space-y-1">
          <NavLinks />
        </div>

        <div className="p-4 border-t border-sidebar-border/50 bg-sidebar/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground uppercase">
              {user?.email?.charAt(0) || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">
                {user?.email ? user.email.split("@")[0] : "Usuário"}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">
                {user?.email || "carregando..."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground p-4 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                  <LogoIcon className="h-9 w-9 rounded-lg" />
                  <span className="font-display text-lg font-semibold">
                    MRM <span className="text-red-600">AUTOMÓVEIS</span>
                  </span>
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 hover:bg-sidebar-accent rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Link to="/vehicles/new" onClick={() => setOpen(false)}>
                <Button className="w-full bg-gradient-gold text-gold-foreground mb-3 shadow-gold transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  <Plus className="h-4 w-4 mr-2" /> Novo veículo
                </Button>
              </Link>
              <NavLinks />
              <div className="mt-auto pt-4 border-t border-sidebar-border">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </Button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-14 border-b flex items-center px-4 gap-3 bg-card">
          <button onClick={() => setOpen(true)} className="p-1">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="font-display font-semibold">
            MRM <span className="text-red-600">AUTOMÓVEIS</span>
          </Link>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
