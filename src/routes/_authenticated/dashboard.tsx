import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Car, TrendingUp, TrendingDown, DollarSign, Plus, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, fmtDate } from "@/lib/format";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { FadeIn, FadeInStagger } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MRM AUTOMÓVEIS" }] }),
  component: Dashboard,
});

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  purchase_price: number;
  sale_price: number | null;
  status: string;
  sale_date: string | null;
  purchase_date: string | null;
  created_at: string;
  asking_price: number | null;
  profit_margin_pct: number;
  is_trade_in: boolean;
};
type Expense = { vehicle_id: string; amount: number; expense_date: string };

async function fetchData() {
  const [v, e, n, inst] = await Promise.all([
    supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
    supabase.from("vehicle_expenses").select("vehicle_id, amount, expense_date"),
    supabase.from("negotiations").select("*"),
    supabase
      .from("installments")
      .select("*")
      .eq("status", "pending")
      .order("due_date", { ascending: true }),
  ]);
  if (v.error) throw v.error;
  if (e.error) throw e.error;
  return {
    vehicles: (v.data ?? []) as Vehicle[],
    expenses: (e.data ?? []) as Expense[],
    negotiations: n.data ?? [],
    pendingInstallments: inst.data ?? [],
  };
}

function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchData });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const vehicles = data?.vehicles ?? [];
  const expenses = data?.expenses ?? [];
  const negotiations = data?.negotiations ?? [];
  const pendingInstallments = data?.pendingInstallments ?? [];

  const expByVehicle = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.vehicle_id] = (acc[e.vehicle_id] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  const totalStock = vehicles.filter((v) => v.status !== "sold").length;
  const totalSold = vehicles.filter((v) => v.status === "sold").length;
  const totalInvested = vehicles.reduce(
    (a, v) => a + Number(v.purchase_price) + (expByVehicle[v.id] ?? 0),
    0,
  );
  const totalRevenue = vehicles
    .filter((v) => v.status === "sold")
    .reduce((a, v) => a + Number(v.sale_price ?? 0), 0);

  const totalProfit = vehicles
    .filter((v) => v.status === "sold")
    .reduce((a, v) => {
      const cost = Number(v.purchase_price) + (expByVehicle[v.id] ?? 0);
      return a + (Number(v.sale_price ?? 0) - cost);
    }, 0);

  const projectedProfit = vehicles
    .filter((v) => v.status !== "sold")
    .reduce((a, v) => {
      const cost = Number(v.purchase_price) + (expByVehicle[v.id] ?? 0);
      const sale = v.asking_price ?? cost * (1 + Number(v.profit_margin_pct || 0) / 100);
      return a + (sale - cost);
    }, 0);

  const totalToReceive = pendingInstallments.reduce((a, i) => a + Number(i.amount), 0);
  const tradeInStockValue = vehicles
    .filter((v) => v.is_trade_in && v.status !== "sold")
    .reduce((a, v) => a + Number(v.purchase_price), 0);

  const months: { label: string; key: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("pt-BR", { month: "short" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  const chartData = months.map((m) => {
    const saidas =
      vehicles
        .filter((v) => v.purchase_date?.startsWith(m.key))
        .reduce((a, v) => a + Number(v.purchase_price), 0) +
      expenses
        .filter((e) => e.expense_date?.startsWith(m.key))
        .reduce((a, e) => a + Number(e.amount), 0);
    const entradas = vehicles
      .filter((v) => v.status === "sold" && v.sale_date?.startsWith(m.key))
      .reduce((a, v) => a + Number(v.sale_price ?? 0), 0);
    return { mes: m.label, entradas, saidas, lucro: entradas - saidas };
  });

  const statusData = [
    {
      name: "Disponíveis",
      value: vehicles.filter((v) => v.status === "available").length,
      color: "var(--color-gold)",
    },
    {
      name: "Manutenção",
      value: vehicles.filter((v) => v.status === "maintenance").length,
      color: "var(--color-destructive)",
    },
    {
      name: "Reservados",
      value: vehicles.filter((v) => v.status === "reserved").length,
      color: "var(--color-chart-2)",
    },
    {
      name: "Vendidos",
      value: vehicles.filter((v) => v.status === "sold").length,
      color: "var(--color-success)",
    },
  ].filter((d) => d.value > 0);

  const recent = vehicles.slice(0, 5);

  return (
    <div className="p-6 lg:p-10 space-y-10 max-w-7xl mx-auto">
      <FadeIn direction="down" distance={10}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-8 rounded-3xl border border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors" />
          <div className="relative">
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-black tracking-tight bg-gradient-primary bg-clip-text text-transparent">
              Bem-vindo ao MRM AUTOMÓVEIS
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Aqui está o que está acontecendo com sua loja hoje.
            </p>
          </div>
          <div className="relative flex items-center gap-3">
            <Link to="/vehicles/new">
              <Button className="bg-gradient-primary shadow-elegant h-12 px-6 rounded-xl text-white font-bold hover:scale-105 transition-transform">
                <Plus className="h-5 w-5 mr-2" />
                Cadastrar veículo
              </Button>
            </Link>
          </div>
        </div>
      </FadeIn>

      <FadeInStagger className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          icon={Car}
          label="Em estoque"
          value={String(totalStock)}
          sub={`${totalSold} vendidos`}
        />
        <StatCard
          icon={TrendingDown}
          label="Total investido"
          value={brl(totalInvested)}
          sub="Compras e despesas"
          tone="destructive"
        />
        <StatCard
          icon={DollarSign}
          label="Lucro realizado"
          value={brl(totalProfit)}
          sub={
            totalRevenue > 0
              ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% de margem`
              : "Vendas concluídas"
          }
          tone="gold"
        />
        <StatCard
          icon={TrendingUp}
          label="Previsão de lucro"
          value={brl(projectedProfit)}
          sub="Potencial do estoque"
          tone="success"
        />
        <StatCard
          icon={DollarSign}
          label="A Receber"
          value={brl(totalToReceive)}
          sub={`${pendingInstallments.length} parcelas pendentes`}
          tone="gold"
        />
        <StatCard
          icon={Car}
          label="Estoque Trocas"
          value={brl(tradeInStockValue)}
          sub="Patrimônio em trocas"
          tone="default"
        />
      </FadeInStagger>

      <div className="grid gap-6 lg:grid-cols-2">
        {pendingInstallments.length > 0 && (
          <FadeIn className="lg:col-span-2">
            <Card className="p-6 border-amber-200 bg-amber-50/30">
              <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                ⚠️ Alertas Financeiros
                <Badge variant="outline" className="bg-amber-100">
                  {pendingInstallments.length}
                </Badge>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const overdue = pendingInstallments.filter((i) => new Date(i.due_date) < today);
                  const dueToday = pendingInstallments.filter((i) => {
                    const d = new Date(i.due_date);
                    d.setHours(0, 0, 0, 0);
                    return d.getTime() === today.getTime();
                  });
                  const due3Days = pendingInstallments.filter((i) => {
                    const d = new Date(i.due_date);
                    d.setHours(0, 0, 0, 0);
                    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
                    return diff > 0 && diff <= 3;
                  });
                  const due7Days = pendingInstallments.filter((i) => {
                    const d = new Date(i.due_date);
                    d.setHours(0, 0, 0, 0);
                    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
                    return diff > 3 && diff <= 7;
                  });

                  return (
                    <>
                      {overdue.length > 0 && (
                        <div className="p-4 rounded-xl border bg-destructive/10 border-destructive/20">
                          <div className="text-xs font-bold text-destructive uppercase tracking-wider">
                            Em Atraso
                          </div>
                          <div className="text-2xl font-bold text-destructive mt-1">
                            {overdue.length}
                          </div>
                          <div className="text-xs text-destructive/80 mt-1">
                            Total: {brl(overdue.reduce((a, b) => a + Number(b.amount), 0))}
                          </div>
                        </div>
                      )}
                      {dueToday.length > 0 && (
                        <div className="p-4 rounded-xl border bg-orange-100 border-orange-200 text-orange-800">
                          <div className="text-xs font-bold uppercase tracking-wider">
                            Vencendo Hoje
                          </div>
                          <div className="text-2xl font-bold mt-1">{dueToday.length}</div>
                          <div className="text-xs opacity-80 mt-1">
                            Total: {brl(dueToday.reduce((a, b) => a + Number(b.amount), 0))}
                          </div>
                        </div>
                      )}
                      {due3Days.length > 0 && (
                        <div className="p-4 rounded-xl border bg-amber-100 border-amber-200 text-amber-800">
                          <div className="text-xs font-bold uppercase tracking-wider">
                            Próximos 3 dias
                          </div>
                          <div className="text-2xl font-bold mt-1">{due3Days.length}</div>
                          <div className="text-xs opacity-80 mt-1">
                            Total: {brl(due3Days.reduce((a, b) => a + Number(b.amount), 0))}
                          </div>
                        </div>
                      )}
                      {due7Days.length > 0 && (
                        <div className="p-4 rounded-xl border bg-blue-50 border-blue-100 text-blue-800">
                          <div className="text-xs font-bold uppercase tracking-wider">
                            Próximos 7 dias
                          </div>
                          <div className="text-2xl font-bold mt-1">{due7Days.length}</div>
                          <div className="text-xs opacity-80 mt-1">
                            Total: {brl(due7Days.reduce((a, b) => a + Number(b.amount), 0))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Quick WhatsApp Billing List */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-3">Próximos Vencimentos / Atrasados</h3>
                <div className="space-y-2 max-h-60 overflow-auto pr-2">
                  {pendingInstallments.slice(0, 10).map((inst) => {
                    const neg = negotiations.find((n) => n.id === inst.negotiation_id);
                    if (!neg || !neg.buyer_phone) return null;

                    const isOverdue =
                      new Date(inst.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                    const text = `Olá ${neg.buyer_name?.split(" ")[0]}, tudo bem? Somos da MRM Automóveis. Passando para lembrar sobre a parcela do seu veículo no valor de ${brl(inst.amount)} com vencimento em ${fmtDate(inst.due_date)}.\nQualquer dúvida estamos à disposição!`;

                    return (
                      <div
                        key={inst.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/50 border shadow-sm"
                      >
                        <div>
                          <div className="font-medium text-sm">{neg.buyer_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className={isOverdue ? "text-destructive font-semibold" : ""}>
                              {fmtDate(inst.due_date)} {isOverdue && "(Atrasado)"}
                            </span>
                            •<span className="font-medium">{brl(inst.amount)}</span>
                          </div>
                        </div>
                        <a
                          href={`https://wa.me/${neg.buyer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 gap-1.5 px-2.5"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Cobrar
                          </Button>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </FadeIn>
        )}
        <FadeIn className="lg:col-span-2" delay={0.2}>
          <Card className="p-6 h-full transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-semibold">Fluxo de caixa</h2>
              <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => brl(v)}
                  />
                  <Area
                    type="monotone"
                    dataKey="entradas"
                    stroke="var(--color-success)"
                    fill="url(#g1)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="saidas"
                    stroke="var(--color-destructive)"
                    fill="url(#g2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.3}>
          <Card className="p-6 h-full transition-shadow hover:shadow-md">
            <h2 className="font-display text-lg font-semibold mb-6">Status do estoque</h2>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cadastre seu primeiro veículo.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {statusData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.4}>
        <Card className="p-6 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Veículos recentes</h2>
            <Link to="/vehicles" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum veículo cadastrado ainda.
            </p>
          ) : (
            <div className="divide-y">
              {recent.map((v) => {
                const cost = Number(v.purchase_price) + (expByVehicle[v.id] ?? 0);
                const sale =
                  v.status === "sold"
                    ? Number(v.sale_price || 0)
                    : (v.asking_price ?? cost * (1 + Number(v.profit_margin_pct || 0) / 100));
                const profit = sale - cost;
                return (
                  <Link
                    key={v.id}
                    to="/vehicles/$id"
                    params={{ id: v.id }}
                    className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 -mx-2 rounded transition-all hover:pl-4 group"
                  >
                    <div>
                      <div className="font-medium group-hover:text-primary transition-colors">
                        {v.brand} {v.model} {v.year && `· ${v.year}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Status:{" "}
                        {v.status === "sold"
                          ? "Vendido"
                          : v.status === "reserved"
                            ? "Reservado"
                            : v.status === "maintenance"
                              ? "Manutenção"
                              : "Disponível"}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium">{brl(sale)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Preço {v.status === "sold" ? "venda" : "venda est."}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            "text-sm font-bold",
                            profit >= 0 ? "text-success" : "text-destructive",
                          )}
                        >
                          {brl(profit)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {v.status === "sold" ? "Lucro real" : "Lucro est."}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "destructive" | "gold";
}) {
  const toneClasses = {
    default: "bg-primary/10 text-primary border-primary/20",
    success: "bg-success/10 text-success border-success/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    gold: "bg-gold/10 text-gold border-gold/20",
  }[tone];

  return (
    <FadeIn>
      <div className="glass p-5 sm:p-6 rounded-2xl transition-all duration-500 hover:shadow-card hover:-translate-y-1 group relative overflow-hidden">
        <div
          className={cn(
            "absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-[0.05] group-hover:opacity-[0.12] group-hover:scale-150 blur-xl transition-all duration-700",
            tone === "destructive"
              ? "bg-destructive"
              : tone === "success"
                ? "bg-success"
                : tone === "gold"
                  ? "bg-gold"
                  : "bg-primary",
          )}
        />
        <div className="flex items-start justify-between relative z-10 gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs 2xl:text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
              {label}
            </p>
            <p className="font-display text-sm sm:text-base xl:text-lg 2xl:text-base font-black text-foreground tracking-tighter truncate">
              {value}
            </p>
            {sub && (
              <p className="text-[10px] sm:text-xs 2xl:text-[10px] text-muted-foreground font-medium flex items-center gap-1 opacity-80 mt-1 truncate">
                {sub}
              </p>
            )}
          </div>
          <div
            className={cn(
              "h-10 w-10 sm:h-12 sm:w-12 2xl:h-10 2xl:w-10 rounded-xl sm:rounded-2xl 2xl:rounded-xl shrink-0 flex items-center justify-center transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 border",
              toneClasses,
            )}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 2xl:h-5 2xl:w-5" />
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
