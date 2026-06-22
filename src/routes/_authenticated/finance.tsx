import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { brl, fmtDate } from "@/lib/format";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Financeiro — MRM AUTOMÓVEIS" }] }),
  component: Finance,
});

import { type Database } from "@/integrations/supabase/types";

type Negotiation = Database["public"]["Tables"]["negotiations"]["Row"];
type Installment = Database["public"]["Tables"]["installments"]["Row"];

interface NegotiationWithInstallments extends Negotiation {
  installments: Installment[] | null;
}

type Row = {
  date: string;
  type: "in" | "out";
  amount: number;
  label: string;
  sub?: string;
  user_id?: string;
};

async function fetchFinance() {
  const [v, e, n] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        "id, brand, model, purchase_price, purchase_date, sale_price, sale_date, status, intermediary_commission, tax_amount, user_id, is_trade_in",
      ),
    supabase
      .from("vehicle_expenses")
      .select("id, vehicle_id, description, amount, expense_date, category, user_id"),
    supabase.from("negotiations").select("*, installments(*)"),
  ]);
  if (v.error) throw v.error;
  if (e.error) throw e.error;

  const rows: Row[] = [];
  const negs = (n.data ?? []) as NegotiationWithInstallments[];

  for (const car of v.data ?? []) {
    // Compras normais (não vindas de troca)
    if (car.purchase_date && Number(car.purchase_price) > 0 && !car.is_trade_in) {
      rows.push({
        date: car.purchase_date,
        type: "out",
        amount: Number(car.purchase_price),
        label: `Compra: ${car.brand} ${car.model}`,
        sub: "Aquisição",
        user_id: car.user_id,
      });
    }

    // Se o veículo foi vendido, processamos o financeiro da negociação
    if (car.status === "sold") {
      const neg = negs.find((neg) => neg.vehicle_id === car.id);
      if (neg) {
        // Entrada de dinheiro (Cash)
        if (Number(neg.cash_amount) > 0) {
          rows.push({
            date: neg.sale_date,
            type: "in",
            amount: Number(neg.cash_amount),
            label: `Venda (Dinheiro): ${car.brand} ${car.model}`,
            sub: "Receita Imediata",
            user_id: car.user_id,
          });
        }

        // Sinal (Down Payment)
        if (Number(neg.down_payment_amount) > 0) {
          rows.push({
            date: neg.down_payment_date || neg.sale_date,
            type: "in",
            amount: Number(neg.down_payment_amount),
            label: `Sinal: ${car.brand} ${car.model}`,
            sub: "Sinal da Negociação",
            user_id: car.user_id,
          });
        }

        // Parcelas já pagas
        const paidInsts = (neg.installments || []).filter((i) => i.status === "paid");
        for (const inst of paidInsts) {
          rows.push({
            date: inst.payment_date || inst.due_date,
            type: "in",
            amount: Number(inst.amount),
            label: `Parcela Paga: ${car.brand} ${car.model}`,
            sub: "Receita Parcelada",
            user_id: car.user_id,
          });
        }
      } else if (car.sale_date && Number(car.sale_price ?? 0) > 0) {
        // Fallback para vendas sem registro de negociação (legacy)
        rows.push({
          date: car.sale_date,
          type: "in",
          amount: Number(car.sale_price),
          label: `Venda: ${car.brand} ${car.model}`,
          sub: "Receita",
          user_id: car.user_id,
        });
      }

      // Custos fixos da venda
      if (Number(car.intermediary_commission ?? 0) > 0) {
        rows.push({
          date: car.sale_date || new Date().toISOString().slice(0, 10),
          type: "out",
          amount: Number(car.intermediary_commission),
          label: `Comissão: ${car.brand} ${car.model}`,
          sub: "Intermediário",
          user_id: car.user_id,
        });
      }
      if (Number(car.tax_amount ?? 0) > 0) {
        rows.push({
          date: car.sale_date || new Date().toISOString().slice(0, 10),
          type: "out",
          amount: Number(car.tax_amount),
          label: `Imposto: ${car.brand} ${car.model}`,
          sub: "Tributação",
          user_id: car.user_id,
        });
      }
    }
  }

  const pendingInsts = negs
    .flatMap((n) => n.installments || [])
    .filter((i) => i.status === "pending");
  for (const inst of pendingInsts) {
    rows.push({
      date: inst.due_date,
      type: "in",
      amount: Number(inst.amount),
      label: "Recebimento Previsto",
      sub: "Previsão Parcelada",
    });
  }
  for (const ex of e.data ?? []) {
    rows.push({
      date: ex.expense_date,
      type: "out",
      amount: Number(ex.amount),
      label: ex.description,
      sub: `Despesa · ${ex.category}`,
      user_id: ex.user_id,
    });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
}

function Finance() {
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["finance"], queryFn: fetchFinance });

  const groupedRows = useMemo(() => {
    const groups: Record<string, { label: string; total: number; items: Row[]; date: string }> = {};
    for (const r of rows) {
      if (!groups[r.label]) {
        groups[r.label] = { label: r.label, total: 0, items: [], date: r.date };
      }
      groups[r.label].items.push(r);
      groups[r.label].total += r.type === "in" ? r.amount : -r.amount;
      if (r.date > groups[r.label].date) groups[r.label].date = r.date;
    }
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [rows]);

  function handleExport() {
    if (rows.length === 0) {
      toast.error("Nenhum dado disponível para exportar.");
      return;
    }

    try {
      const headers = ["Data", "Tipo", "Descricao", "Categoria", "Valor"];
      const csvContent = [
        headers.join(","),
        ...rows.map((r) =>
          [
            fmtDate(r.date),
            r.type === "in" ? "Entrada" : "Saída",
            `"${r.label.replace(/"/g, '""')}"`,
            `"${r.sub?.replace(/"/g, '""') || ""}"`,
            r.amount.toFixed(2).replace(".", ","),
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `relatorio-financeiro-${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erro ao exportar o relatório.");
    }
  }

  const entradasRealizadas = rows
    .filter((r) => r.type === "in" && r.sub !== "Previsão Parcelada")
    .reduce((a, r) => a + r.amount, 0);
  const entradasPrevistas = rows
    .filter((r) => r.type === "in" && r.sub === "Previsão Parcelada")
    .reduce((a, r) => a + r.amount, 0);
  const saidas = rows.filter((r) => r.type === "out").reduce((a, r) => a + r.amount, 0);
  const saldoAtual = entradasRealizadas - saidas;

  // monthly chart
  const months: { label: string; key: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("pt-BR", { month: "short", year: "2-digit" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  let cumulative = 0;
  const chartData = months.map((m) => {
    const ent = rows
      .filter((r) => r.type === "in" && r.date?.startsWith(m.key))
      .reduce((a, r) => a + r.amount, 0);
    const sai = rows
      .filter((r) => r.type === "out" && r.date?.startsWith(m.key))
      .reduce((a, r) => a + r.amount, 0);
    cumulative += ent - sai;
    return { mes: m.label, entradas: ent, saidas: sai, saldo: cumulative };
  });

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Acompanhe entradas, saídas e fluxo de caixa.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={rows.length === 0}
          className="w-full sm:w-auto border-emerald-500/30 text-emerald-700 hover:bg-emerald-50"
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Entradas Realizadas</p>
              <p className="font-display text-2xl font-bold mt-1 text-success">
                {brl(entradasRealizadas)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success/15 text-success flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">A Receber</p>
              <p className="font-display text-2xl font-bold mt-1 text-gold">
                {brl(entradasPrevistas)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-gold/15 text-gold flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saídas</p>
              <p className="font-display text-2xl font-bold mt-1 text-destructive">{brl(saidas)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-primary text-primary-foreground shadow-elegant">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-primary-foreground/80">Saldo em Caixa</p>
              <p className="font-display text-2xl font-bold mt-1">{brl(saldoAtual)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-gold/30 text-gold flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Entradas vs Saídas (12 meses)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => brl(v)}
                />
                <Legend />
                <Bar dataKey="entradas" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="saidas" fill="var(--color-destructive)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Saldo acumulado</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => brl(v)}
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{ fill: "var(--color-gold)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Lançamentos</h2>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="in">Entradas</TabsTrigger>
            <TabsTrigger value="out">Saídas</TabsTrigger>
          </TabsList>
          {(["all", "in", "out"] as const).map((t) => (
            <TabsContent key={t} value={t}>
              {isLoading ? (
                <p className="text-muted-foreground text-sm py-4">Carregando...</p>
              ) : groupedRows.filter((g) => t === "all" || g.items.some((i) => i.type === t))
                  .length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Nenhum lançamento.</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {groupedRows
                    .filter((g) => t === "all" || g.items.some((i) => i.type === t))
                    .map((g, idx) => (
                      <AccordionItem
                        value={`item-${idx}`}
                        key={idx}
                        className="border-b border-white/5"
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex flex-col items-start text-left gap-1">
                              <span className="font-medium text-sm text-foreground">{g.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {g.items.length} {g.items.length === 1 ? "registro" : "registros"} ·{" "}
                                {fmtDate(g.date)}
                              </span>
                            </div>
                            <span
                              className={`font-display font-bold ${g.total >= 0 ? "text-success" : "text-destructive"}`}
                            >
                              {g.total >= 0 ? "+" : "−"} {brl(Math.abs(g.total))}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-4 py-2 space-y-3 border-l-2 border-muted/50 ml-2">
                            {g.items
                              .filter((r) => t === "all" || r.type === t)
                              .map((r, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between bg-muted/20 p-2 rounded-md"
                                >
                                  <div>
                                    <div className="text-sm font-medium">{r.sub}</div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                      {fmtDate(r.date)}
                                    </div>
                                  </div>
                                  <span
                                    className={`font-medium text-sm ${r.type === "in" ? "text-success" : "text-destructive"}`}
                                  >
                                    {r.type === "in" ? "+" : "−"} {brl(r.amount)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}

function UserBadge({ userId }: { userId: string }) {
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();
      return data;
    },
  });

  if (!profile?.full_name) return null;

  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
      Usuário: {profile.full_name}
    </span>
  );
}
