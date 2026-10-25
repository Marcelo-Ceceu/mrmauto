import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Wallet,
  Handshake,
  Calendar,
  Gauge,
  Clock,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, fmtDate } from "@/lib/format";
import { isVehicleConsigned } from "@/lib/consignment";
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
  mileage: number | null;
  photos: string[] | null;
  notes: string | null;
  plate: string | null;
};

type Expense = { vehicle_id: string; amount: number; expense_date: string };

type Negotiation = {
  id: string;
  vehicle_id: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  sale_date: string;
};

type Installment = {
  id: string;
  negotiation_id: string;
  amount: number;
  due_date: string;
  status: string;
};

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
    negotiations: (n.data ?? []) as Negotiation[],
    pendingInstallments: (inst.data ?? []) as Installment[],
  };
}

function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchData });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh] bg-[#0b0d11]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          <span className="text-xs text-zinc-400 font-semibold tracking-wider uppercase">
            Carregando indicadores...
          </span>
        </div>
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

  const stockVehicles = vehicles.filter((v) => v.status !== "sold");
  const soldVehicles = vehicles.filter((v) => v.status === "sold");

  const stockConsignedCount = stockVehicles.filter(isVehicleConsigned).length;
  const stockOwnPropertyCount = stockVehicles.length - stockConsignedCount;

  const totalStock = stockVehicles.length;
  const totalSold = soldVehicles.length;

  // Capital próprio investido pela loja no estoque:
  // - Para veículos próprios: compra + despesas de preparação
  // - Para consignados: apenas as despesas que saíram do bolso da loja (o veículo pertence ao cliente e o repasse é pós-venda)
  const totalInvested = stockVehicles.reduce((a, v) => {
    const isConsigned = isVehicleConsigned(v);
    const expenses = expByVehicle[v.id] ?? 0;
    return a + (isConsigned ? expenses : Number(v.purchase_price) + expenses);
  }, 0);

  // Valor total de repasse acordado dos veículos consignados em estoque
  const totalConsignedStockValue = stockVehicles
    .filter(isVehicleConsigned)
    .reduce((a, v) => a + Number(v.purchase_price), 0);

  const totalRevenue = soldVehicles.reduce((a, v) => a + Number(v.sale_price ?? 0), 0);

  // Lucro Realizado das vendas concluídas:
  // - Próprios: venda - (compra + despesas)
  // - Consignados: venda - (repasse ao dono + despesas da loja)
  const totalProfit = soldVehicles.reduce((a, v) => {
    const cost = Number(v.purchase_price) + (expByVehicle[v.id] ?? 0);
    return a + (Number(v.sale_price ?? 0) - cost);
  }, 0);

  // Previsão de Lucro do estoque ativo:
  // - Próprios: (asking_price ou sugerido) - (compra + despesas)
  // - Consignados: (asking_price ou sugerido) - (repasse + despesas)
  const projectedProfit = stockVehicles.reduce((a, v) => {
    const cost = Number(v.purchase_price) + (expByVehicle[v.id] ?? 0);
    const sale = v.asking_price ?? cost * (1 + Number(v.profit_margin_pct || 0) / 100);
    return a + (sale - cost);
  }, 0);

  const totalToReceive = pendingInstallments.reduce((a, i) => a + Number(i.amount), 0);
  const tradeInStockValue = vehicles
    .filter((v) => v.is_trade_in && v.status !== "sold")
    .reduce((a, v) => a + Number(v.purchase_price), 0);

  // Gráfico de fluxo de caixa dos últimos 6 meses
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
      color: "#ef4444", // Vermelho esportivo MRM
    },
    {
      name: "Vendidos",
      value: vehicles.filter((v) => v.status === "sold").length,
      color: "#10b981", // Verde
    },
    {
      name: "Manutenção",
      value: vehicles.filter((v) => v.status === "maintenance").length,
      color: "#f59e0b", // Âmbar
    },
    {
      name: "Reservados",
      value: vehicles.filter((v) => v.status === "reserved").length,
      color: "#3b82f6", // Azul
    },
  ].filter((d) => d.value > 0);

  const recentVehicles = vehicles.slice(0, 6);

  // Cálculos de alertas
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueList = pendingInstallments.filter((i) => new Date(i.due_date) < today);
  const dueTodayList = pendingInstallments.filter((i) => {
    const d = new Date(i.due_date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const dueNext7DaysList = pendingInstallments.filter((i) => {
    const d = new Date(i.due_date);
    d.setHours(0, 0, 0, 0);
    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 7;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-[#0b0d11] text-zinc-100 min-h-screen">
      {/* ── CABEÇALHO COMPACTO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
              Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-red-600/15 border border-red-600/30 text-red-500 text-[10px] font-bold uppercase tracking-wider">
              Ao vivo
            </span>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
            Gestão operacional, indicadores financeiros e movimentações de estoque
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/vehicles/new">
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 rounded-xl shadow-md shadow-red-600/25 transition-all hover:scale-105 gap-2 text-sm">
              <Plus className="h-4 w-4" />
              <span>+ Novo veículo</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── INDICADORES FINANCEIROS (CARDS ESCUROS UNIFORMES) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Estoque Ativo */}
        <StatCard
          icon={Car}
          label="Estoque Ativo"
          value={`${totalStock} veículos`}
          sub={`${stockOwnPropertyCount} próprios · ${stockConsignedCount} consignados`}
          tone="red"
        />

        {/* Card 2: Capital Investido */}
        <StatCard
          icon={TrendingDown}
          label="Capital Investido"
          value={brl(totalInvested)}
          sub={
            stockConsignedCount > 0
              ? `Próprios (+ ${brl(totalConsignedStockValue)} consignado)`
              : "Compras e despesas do estoque"
          }
          tone="zinc"
        />

        {/* Card 3: Lucro Realizado */}
        <StatCard
          icon={DollarSign}
          label="Lucro Realizado"
          value={brl(totalProfit)}
          sub={
            totalRevenue > 0
              ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% margem realizada`
              : `${totalSold} vendas concluídas`
          }
          tone="emerald"
        />

        {/* Card 4: Previsão de Lucro */}
        <StatCard
          icon={TrendingUp}
          label="Previsão de Lucro"
          value={brl(projectedProfit)}
          sub={`Potencial para ${totalStock} veículos em estoque`}
          tone="red"
        />

        {/* Card 5: A Receber */}
        <StatCard
          icon={Wallet}
          label="A Receber"
          value={brl(totalToReceive)}
          sub={`${pendingInstallments.length} parcelas pendentes`}
          tone="amber"
        />

        {/* Card 6: Estoque Trocas */}
        <StatCard
          icon={Handshake}
          label="Estoque Trocas"
          value={brl(tradeInStockValue)}
          sub="Patrimônio em trocas"
          tone="blue"
        />
      </div>

      {/* ── CARD COMPACTO: ALERTAS FINANCEIROS ── */}
      {pendingInstallments.length > 0 && (
        <div className="bg-[#141820] border border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                  Alertas Financeiros
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px]">
                    {pendingInstallments.length} pendentes
                  </Badge>
                </h3>
                <p className="text-[11px] text-zinc-400">Acompanhamento de parcelas e cobrança rápida</p>
              </div>
            </div>

            <Link to="/finance">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs h-8 px-3 rounded-lg"
              >
                Ver todos no Financeiro →
              </Button>
            </Link>
          </div>

          {/* Resumo em blocos compactos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">
                  Em Atraso
                </span>
                <span className="text-xl font-black text-white font-display">
                  {overdueList.length}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">Valor total</span>
                <span className="text-xs font-bold text-red-400">
                  {brl(overdueList.reduce((a, b) => a + Number(b.amount), 0))}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Vencendo Hoje
                </span>
                <span className="text-xl font-black text-white font-display">
                  {dueTodayList.length}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">Valor total</span>
                <span className="text-xs font-bold text-amber-400">
                  {brl(dueTodayList.reduce((a, b) => a + Number(b.amount), 0))}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Próximos 7 Dias
                </span>
                <span className="text-xl font-black text-white font-display">
                  {dueNext7DaysList.length}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">Valor total</span>
                <span className="text-xs font-bold text-zinc-300">
                  {brl(dueNext7DaysList.reduce((a, b) => a + Number(b.amount), 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Lista rápida de cobrança (até 4 parcelas) */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Próximas cobranças prioritárias
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {pendingInstallments.slice(0, 4).map((inst) => {
                const neg = negotiations.find((n) => n.id === inst.negotiation_id);
                const isOverdue = new Date(inst.due_date) < today;
                const buyerPhone = neg?.buyer_phone?.replace(/\D/g, "") || "";
                const textMsg = `Olá ${neg?.buyer_name?.split(" ")[0] || "Cliente"}, tudo bem? Somos da MRM Automóveis. Passando para lembrar sobre a parcela do seu veículo no valor de ${brl(inst.amount)} com vencimento em ${fmtDate(inst.due_date)}.\nQualquer dúvida estamos à disposição!`;

                return (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#0e1117] border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-white truncate">
                        {neg?.buyer_name || "Cliente não informado"}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                        <span className={cn(isOverdue && "text-red-400 font-bold")}>
                          Venc: {fmtDate(inst.due_date)} {isOverdue && "(Atrasado)"}
                        </span>
                        <span>•</span>
                        <span className="text-zinc-200 font-bold">{brl(inst.amount)}</span>
                      </div>
                    </div>

                    {buyerPhone ? (
                      <a
                        href={`https://wa.me/${buyerPhone}?text=${encodeURIComponent(textMsg)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-sm shrink-0"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Cobrar WhatsApp</span>
                        </Button>
                      </a>
                    ) : (
                      <span className="text-[10px] text-zinc-500 italic">Sem telefone</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SEÇÃO: GRÁFICO DE FLUXO DE CAIXA + STATUS DO ESTOQUE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Fluxo de Caixa (2 colunas) */}
        <div className="lg:col-span-2 bg-[#141820] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-white">
                Fluxo de Caixa
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Histórico de entradas e saídas financeiras nos últimos 6 meses
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Saídas (Compras & Despesas)
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Entradas (Vendas)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  {/* Gradiente Vermelho Esportivo para Saídas */}
                  <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  {/* Gradiente Verde para Entradas */}
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="mes"
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "12px",
                    color: "#f4f4f5",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                  formatter={(v: number) => [brl(v)]}
                  labelStyle={{ fontWeight: "bold", color: "#ffffff", marginBottom: "4px" }}
                />
                <Area
                  type="monotone"
                  name="Entradas"
                  dataKey="entradas"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#greenGradient)"
                  dot={{ r: 3, fill: "#10b981" }}
                  activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" }}
                />
                <Area
                  type="monotone"
                  name="Saídas"
                  dataKey="saidas"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fill="url(#redGradient)"
                  dot={{ r: 3, fill: "#ef4444" }}
                  activeDot={{ r: 5, stroke: "#ef4444", strokeWidth: 2, fill: "#ffffff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Donut de Status do Estoque (1 coluna) */}
        <div className="bg-[#141820] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="font-display font-bold text-base sm:text-lg text-white">
              Status do Estoque
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Distribuição atual dos veículos cadastrados</p>
          </div>

          {statusData.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs">
              Nenhum veículo em estoque no momento.
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {statusData.map((d, i) => (
                      <Cell key={i} fill={d.color} stroke="#141820" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#3f3f46",
                      borderRadius: "10px",
                      color: "#ffffff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-zinc-300 font-medium">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>Total de registros:</span>
            <strong className="text-white font-bold">{vehicles.length} veículos</strong>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO: VEÍCULOS RECENTES (LISTA ORGANIZADA COM FOTOS E DADOS REAIS) ── */}
      <div className="bg-[#141820] border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-zinc-800/80">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-white">
              Veículos Recentes no Estoque
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Últimos veículos cadastrados com custos, preços reais e margem
            </p>
          </div>

          <Link to="/vehicles">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-xs font-semibold gap-1.5 p-0 sm:px-3 h-8"
            >
              <span>Ver estoque completo ({vehicles.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {recentVehicles.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            Nenhum veículo cadastrado ainda no sistema.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {recentVehicles.map((v) => {
              const isConsigned = isVehicleConsigned(v);
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-3 -mx-3 rounded-xl hover:bg-zinc-800/40 transition-all gap-4 group"
                >
                  {/* Foto e Identificação */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-16 h-12 rounded-lg bg-zinc-900 border border-zinc-700/60 overflow-hidden shrink-0 relative flex items-center justify-center">
                      {v.photos?.[0] ? (
                        <img
                          src={v.photos[0]}
                          alt={`${v.brand} ${v.model}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Car className="h-5 w-5 text-zinc-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-display font-bold text-sm text-white group-hover:text-red-400 transition-colors truncate">
                        {v.brand} {v.model}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                        {v.year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-zinc-500" />
                            {v.year}
                          </span>
                        )}
                        {v.mileage != null && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Gauge className="h-3 w-3 text-zinc-500" />
                              {v.mileage.toLocaleString("pt-BR")} km
                            </span>
                          </>
                        )}
                        {v.plate && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-500 font-mono uppercase">{v.plate}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status, Preço e Margem */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/50">
                    {/* Modalidade & Status Badges */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                          isConsigned
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : "bg-zinc-800 text-zinc-300 border-zinc-700/60",
                        )}
                      >
                        {isConsigned ? "Consignado" : "Próprio"}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          v.status === "sold" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
                          v.status === "available" && "bg-red-500/10 text-red-400 border-red-500/25",
                          v.status === "maintenance" && "bg-amber-500/10 text-amber-400 border-amber-500/25",
                          v.status === "reserved" && "bg-blue-500/10 text-blue-400 border-blue-500/25",
                        )}
                      >
                        {v.status === "sold"
                          ? "Vendido"
                          : v.status === "available"
                            ? "Disponível"
                            : v.status === "maintenance"
                              ? "Manutenção"
                              : "Reservado"}
                      </span>
                    </div>

                    {/* Preço de Venda Real & Entrada */}
                    <div className="text-right shrink-0">
                      <span className="block text-[10px] text-zinc-500 uppercase font-semibold">
                        {v.status === "sold" ? "Vendido por" : "Preço de venda"}
                      </span>
                      <span className="font-display font-bold text-sm text-white">
                        {brl(sale)}
                      </span>
                      <span className="block text-[9px] text-zinc-500">
                        {isConsigned
                          ? `Entrada: ${brl(v.purchase_price)}`
                          : `Compra: ${brl(v.purchase_price)}`}
                      </span>
                    </div>

                    {/* Lucro Real / Estimado */}
                    <div className="text-right shrink-0 min-w-20">
                      <span className="block text-[10px] text-zinc-500 uppercase font-semibold">
                        {v.status === "sold"
                          ? isConsigned ? "Lucro loja" : "Lucro real"
                          : isConsigned ? "Lucro est. loja" : "Lucro est."}
                      </span>
                      <span
                        className={cn(
                          "font-display font-bold text-xs sm:text-sm",
                          profit >= 0 ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {brl(profit)}
                      </span>
                    </div>

                    <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all hidden sm:block shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "zinc",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "red" | "emerald" | "amber" | "blue" | "zinc";
}) {
  const toneBadge = {
    red: "bg-red-500/15 text-red-500 border-red-500/30",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    zinc: "bg-zinc-800 text-zinc-300 border-zinc-700",
  }[tone];

  return (
    <div className="bg-[#141820] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-zinc-700 transition-all flex flex-col justify-between group relative overflow-hidden">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider truncate">
          {label}
        </span>
        <div
          className={cn(
            "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
            toneBadge,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div>
        <div className="font-display text-xl sm:text-2xl font-black text-white tracking-tight truncate">
          {value}
        </div>
        {sub && <p className="text-[11px] text-zinc-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}
