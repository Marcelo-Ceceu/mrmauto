import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vehicles/")({
  head: () => ({ meta: [{ title: "Veículos — MRM AUTOMÓVEIS" }] }),
  component: VehiclesList,
});

async function fetchVehicles() {
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "id, brand, model, year, mileage, purchase_price, sale_price, status, photos, plate, sale_date, purchase_date",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function VehiclesList() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "sold" | "maintenance">("all");
  const { data, isLoading } = useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });

  const filtered = (data ?? []).filter((v) => {
    if (filter !== "all" && v.status !== filter) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return [v.brand, v.model, v.plate].some((x) => x?.toLowerCase().includes(t));
  });

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Veículos</h1>
          <p className="text-muted-foreground mt-1">
            {(data ?? []).length} veículo(s) cadastrado(s).
          </p>
        </div>
        <Link to="/vehicles/new">
          <Button className="bg-gradient-primary shadow-elegant">
            <Plus className="h-4 w-4 mr-2" />
            Novo veículo
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca, modelo ou placa..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
          {(["all", "available", "maintenance", "sold"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md transition whitespace-nowrap ${filter === f ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              {f === "all"
                ? "Todos"
                : f === "available"
                  ? "Disponíveis"
                  : f === "maintenance"
                    ? "Manutenção"
                    : "Vendidos"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 h-56 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center">
          <Car className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">Nenhum veículo encontrado.</p>
          <Link to="/vehicles/new">
            <Button className="mt-4 bg-gradient-primary">Cadastrar primeiro veículo</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <Link key={v.id} to="/vehicles/$id" params={{ id: v.id }}>
              <Card className="overflow-hidden hover:shadow-elegant transition-all hover:-translate-y-0.5 group cursor-pointer h-full">
                <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                  {v.photos?.[0] ? (
                    <img
                      src={v.photos[0]}
                      alt={`${v.brand} ${v.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-secondary">
                      <Car className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                  <Badge
                    className="absolute top-3 right-3 shadow-elegant"
                    variant={
                      v.status === "sold"
                        ? "default"
                        : v.status === "maintenance"
                          ? "destructive"
                          : v.status === "reserved"
                            ? "outline"
                            : "secondary"
                    }
                  >
                    {v.status === "sold"
                      ? "Vendido"
                      : v.status === "reserved"
                        ? "Reservado"
                        : v.status === "maintenance"
                          ? "Em Manutenção"
                          : "Disponível"}
                  </Badge>
                </div>
                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="font-display font-semibold text-lg leading-tight">
                      {v.brand} {v.model}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {v.year ?? "—"} ·{" "}
                      {v.mileage ? `${v.mileage.toLocaleString("pt-BR")} km` : "—"}{" "}
                      {v.plate && `· ${v.plate}`}
                    </p>
                  </div>
                  <div className="pt-2 border-t flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {v.status === "sold" ? "Vendido por" : "Investido"}
                      </p>
                      <p className="font-display font-bold text-lg">
                        {brl(v.status === "sold" ? v.sale_price : v.purchase_price)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {fmtDate(v.status === "sold" ? v.sale_date : v.purchase_date)}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
