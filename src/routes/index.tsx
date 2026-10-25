import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogoIcon } from "@/components/LogoIcon";
import { WhatsAppLogo } from "@/components/WhatsAppLogo";
import {
  Car,
  ChevronRight,
  MessageCircle,
  Shield,
  BadgeCheck,
  Handshake,
  TrendingUp,
  MapPin,
  Phone,
  Star,
  Fuel,
  Gauge,
  Calendar,
  Search,
  SlidersHorizontal,
  X,
  Flame,
  ArrowUpDown,
  Clock,
} from "lucide-react";
import { brl } from "@/lib/format";
import { useState, useMemo } from "react";
import { VehicleFilterValues } from "@/components/VehicleFilters";
import { FadeIn, FadeInStagger } from "@/components/ui/fade-in";
import { Helmet } from "react-helmet";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { Heart, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const [filterValues, setFilterValues] = useState<VehicleFilterValues>({
    search: "",
    brand: "all",
    minPrice: "",
    maxPrice: "",
    minYear: "",
    maxYear: "",
    maxMileage: "",
  });
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc" | "km-asc">("recent");

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["public-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "id, brand, model, year, photos, asking_price, status, ad_text, mileage, color, is_published",
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching vehicles:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("key, value");
      const map: Record<string, string> = {};
      data?.forEach((item) => {
        map[item.key] = item.value;
      });
      return {
        whatsapp: map["whatsapp_number"] || "5531987984668",
        address: map["store_address"] || "",
      };
    },
  });

  const rawPhone = storeSettings?.whatsapp || "5531987984668";
  const storeAddress =
    storeSettings?.address || "Av. Raja Gabaglia, 2000 - Estoril, Belo Horizonte - MG";
  const whatsappUrl = `https://wa.me/${rawPhone.replace(/\D/g, "")}`;

  const formattedPhone = useMemo(() => {
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length === 13 && digits.startsWith("55")) {
      return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return "(31) 98798-4668";
  }, [rawPhone]);

  const brandCounts = useMemo(() => {
    if (!vehicles) return {};
    const counts: Record<string, number> = {};
    vehicles
      .filter(
        (v) => v.is_published === true && (v.status === "available" || v.status === "maintenance"),
      )
      .forEach((v) => {
        if (v.brand) counts[v.brand] = (counts[v.brand] || 0) + 1;
      });
    return counts;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];

    const list = vehicles.filter((v) => {
      const isPublished = v.is_published === true;
      const isAvailable = v.status === "available" || v.status === "maintenance";
      if (!isPublished || !isAvailable) return false;

      const matchesSearch =
        !filterValues.search ||
        `${v.brand} ${v.model}`.toLowerCase().includes(filterValues.search.toLowerCase());

      const matchesBrand = filterValues.brand === "all" || v.brand === filterValues.brand;

      const price = v.asking_price || 0;
      const matchesPrice = !filterValues.maxPrice || price <= Number(filterValues.maxPrice);

      const year = v.year || 0;
      const matchesYear =
        (!filterValues.minYear || year >= Number(filterValues.minYear)) &&
        (!filterValues.maxYear || year <= Number(filterValues.maxYear));

      const matchesMileage =
        !filterValues.maxMileage || (v.mileage || 0) <= Number(filterValues.maxMileage);

      return matchesSearch && matchesBrand && matchesPrice && matchesYear && matchesMileage;
    });

    return list.sort((a, b) => {
      if (sortBy === "price-asc") return (a.asking_price || 0) - (b.asking_price || 0);
      if (sortBy === "price-desc") return (b.asking_price || 0) - (a.asking_price || 0);
      if (sortBy === "km-asc") return (a.mileage || 0) - (b.mileage || 0);
      return 0;
    });
  }, [vehicles, filterValues, sortBy]);

  const brands = useMemo(() => {
    if (!vehicles) return [];
    const uniqueBrands = Array.from(new Set(vehicles.map((v) => v.brand))).filter(
      Boolean,
    ) as string[];
    return uniqueBrands.sort();
  }, [vehicles]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>MRM Automóveis — Seu próximo carro está aqui</title>
        <meta
          name="description"
          content="Encontre os melhores veículos seminovos em Belo Horizonte. Qualidade, procedência e as melhores taxas de financiamento."
        />
        {typeof window !== "undefined" && <link rel="canonical" href={window.location.origin} />}
      </Helmet>

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoIcon className="w-9 h-9 rounded-xl shadow-elegant" />
            <span className="font-display font-bold text-xl tracking-tight">
              MRM <span className="text-gradient-primary">AUTOMÓVEIS</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#estoque" className="hover:text-foreground transition-colors duration-200">
              Estoque
            </a>
            <a href="#sobre" className="hover:text-foreground transition-colors duration-200">
              Sobre
            </a>
            <a href="#contato" className="hover:text-foreground transition-colors duration-200">
              Contato
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/10 hover:bg-white/5 rounded-xl text-muted-foreground hover:text-red-500 relative"
                >
                  <Heart className="h-4 w-4" />
                  <FavoritesBadge />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-white/10">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500 fill-current" />
                    Meus Favoritos
                  </DialogTitle>
                </DialogHeader>
                <FavoritesList vehicles={vehicles || []} whatsappUrl={whatsappUrl} />
              </DialogContent>
            </Dialog>

            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                className="hidden sm:flex bg-[#25D366] hover:bg-[#20bd5a] shadow-elegant text-white rounded-xl font-bold gap-2 px-3.5 transition-all hover:scale-105"
              >
                <WhatsAppLogo className="h-4 w-4" />
                <span>{formattedPhone}</span>
              </Button>
            </a>
            <Link to="/login">
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 hover:bg-white/5 rounded-xl text-muted-foreground hover:text-foreground"
              >
                Acesso Restrito
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO COMPACTO + BUSCA INTELIGENTE (1ª DOBRA IMEDIATA) ── */}
      <section className="relative pt-24 pb-8 md:pt-28 md:pb-10 overflow-hidden border-b border-white/5 bg-gradient-to-b from-card/40 via-background to-background">
        {/* Background glow effects */}
        <div className="absolute inset-0 -z-10 bg-gradient-hero" />
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/6 rounded-full blur-[140px] animate-float" />
          <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-gold/5 rounded-full blur-[100px] animate-float [animation-delay:3s]" />
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <FadeIn direction="down" distance={15}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Seminovos revisados em Belo Horizonte
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Encontre seu <span className="text-gradient-primary">próximo carro</span> hoje
              </h1>
            </FadeIn>

            <FadeIn direction="up" delay={0.1}>
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground bg-card/60 px-4 py-2 rounded-xl border border-white/10 w-fit backdrop-blur-sm">
                <Car className="h-4 w-4 text-primary" />
                <span>
                  <strong className="text-foreground">{filteredVehicles.length}</strong>{" "}
                  {filteredVehicles.length === 1 ? "veículo disponível" : "veículos disponíveis"}{" "}
                  para pronta entrega
                </span>
              </div>
            </FadeIn>
          </div>

          {/* BARRA DE PESQUISA RÁPIDA */}
          <FadeIn delay={0.15}>
            <div className="bg-card/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-elegant">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
                {/* Campo Busca Texto */}
                <div className="sm:col-span-2 md:col-span-5 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Digite o modelo ou marca (ex: City, Sandero, Palio, XJ6)..."
                    className="pl-10 h-12 bg-background/60 border-white/10 rounded-xl text-sm"
                    value={filterValues.search}
                    onChange={(e) => setFilterValues((p) => ({ ...p, search: e.target.value }))}
                  />
                  {filterValues.search && (
                    <button
                      onClick={() => setFilterValues((p) => ({ ...p, search: "" }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filtro Marca */}
                <div className="md:col-span-3">
                  <Select
                    value={filterValues.brand}
                    onValueChange={(val) => setFilterValues((p) => ({ ...p, brand: val }))}
                  >
                    <SelectTrigger className="h-12 bg-background/60 border-white/10 rounded-xl text-sm">
                      <SelectValue placeholder="Todas as marcas" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10">
                      <SelectItem value="all">Todas as marcas</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b} {brandCounts[b] ? `(${brandCounts[b]})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro Faixa de Preço */}
                <div className="md:col-span-2">
                  <Select
                    value={filterValues.maxPrice || "all"}
                    onValueChange={(val) =>
                      setFilterValues((p) => ({ ...p, maxPrice: val === "all" ? "" : val }))
                    }
                  >
                    <SelectTrigger className="h-12 bg-background/60 border-white/10 rounded-xl text-sm">
                      <SelectValue placeholder="Qualquer valor" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10">
                      <SelectItem value="all">Qualquer valor</SelectItem>
                      <SelectItem value="30000">Até R$ 30.000</SelectItem>
                      <SelectItem value="40000">Até R$ 40.000</SelectItem>
                      <SelectItem value="50000">Até R$ 50.000</SelectItem>
                      <SelectItem value="75000">Até R$ 75.000</SelectItem>
                      <SelectItem value="100000">Até R$ 100.000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Botão de Ação / Limpar */}
                <div className="md:col-span-2 flex items-center gap-2">
                  {filterValues.search ||
                  filterValues.brand !== "all" ||
                  filterValues.maxPrice ||
                  filterValues.maxMileage ? (
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl border-white/15 hover:bg-white/5 gap-2 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setFilterValues({
                          search: "",
                          brand: "all",
                          minPrice: "",
                          maxPrice: "",
                          minYear: "",
                          maxYear: "",
                          maxMileage: "",
                        })
                      }
                    >
                      <X className="h-4 w-4" /> Limpar filtros
                    </Button>
                  ) : (
                    <a href="#estoque" className="w-full">
                      <Button className="w-full h-12 bg-gradient-primary text-white rounded-xl font-bold shadow-elegant hover:opacity-95 transition-opacity gap-2">
                        <Flame className="h-4 w-4" /> Ver Estoque
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Chips de Filtros Rápidos */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5 overflow-x-auto text-xs pb-1 custom-scrollbar">
                <span className="text-muted-foreground font-semibold whitespace-nowrap">
                  Filtros rápidos:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFilterValues((p) => ({ ...p, maxPrice: "", brand: "all", maxMileage: "" }))
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full border whitespace-nowrap transition-all",
                    !filterValues.maxPrice &&
                      filterValues.brand === "all" &&
                      !filterValues.maxMileage
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground border-white/10",
                  )}
                >
                  Todos (
                  {vehicles?.filter(
                    (v) =>
                      v.is_published && (v.status === "available" || v.status === "maintenance"),
                  ).length || 0}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setFilterValues((p) => ({ ...p, maxPrice: "35000" }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full border whitespace-nowrap transition-all",
                    filterValues.maxPrice === "35000"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground border-white/10",
                  )}
                >
                  Até R$ 35 mil
                </button>
                <button
                  type="button"
                  onClick={() => setFilterValues((p) => ({ ...p, maxPrice: "50000" }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full border whitespace-nowrap transition-all",
                    filterValues.maxPrice === "50000"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground border-white/10",
                  )}
                >
                  Até R$ 50 mil
                </button>
                <button
                  type="button"
                  onClick={() => setFilterValues((p) => ({ ...p, maxMileage: "80000" }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full border whitespace-nowrap transition-all",
                    filterValues.maxMileage === "80000"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground border-white/10",
                  )}
                >
                  Até 80.000 km
                </button>
                <button
                  type="button"
                  onClick={() => setFilterValues((p) => ({ ...p, maxMileage: "50000" }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full border whitespace-nowrap transition-all",
                    filterValues.maxMileage === "50000"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground border-white/10",
                  )}
                >
                  Menos de 50.000 km
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── ESTOQUE IMEDIATO (LOGO NA PRIMEIRA TELA) ── */}
      <section id="estoque" className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                <Flame className="h-6 w-6 text-primary" />
                Veículos em <span className="text-gradient-primary">Destaque</span>
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Veículos selecionados, periciados e prontos para entrega imediata.
              </p>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                Ordenar por:
              </span>
              <Select
                value={sortBy}
                onValueChange={(val: "recent" | "price-asc" | "price-desc" | "km-asc") =>
                  setSortBy(val)
                }
              >
                <SelectTrigger className="w-[170px] h-10 bg-card border-white/10 text-xs rounded-xl">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Mais recentes" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 text-xs">
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="price-asc">Menor preço</SelectItem>
                  <SelectItem value="price-desc">Maior preço</SelectItem>
                  <SelectItem value="km-asc">Menor quilometragem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-[420px] rounded-2xl shimmer" />
                ))
              : filteredVehicles.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} whatsappUrl={whatsappUrl} />
                ))}
            {!isLoading && filteredVehicles.length === 0 && (
              <div className="col-span-full text-center py-20 bg-card/30 rounded-2xl border border-white/5">
                <Car className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4 font-medium">
                  Nenhum veículo encontrado com os filtros selecionados.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilterValues({
                      search: "",
                      brand: "all",
                      minPrice: "",
                      maxPrice: "",
                      minYear: "",
                      maxYear: "",
                      maxMileage: "",
                    })
                  }
                  className="border-white/10 hover:bg-white/5 rounded-xl"
                >
                  Limpar todos os filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── DIFERENCIAIS / SOBRE A MRM (APÓS O ESTOQUE) ── */}
      <section
        id="sobre"
        className="py-20 relative border-t border-white/5 bg-gradient-to-b from-card/30 via-background to-background"
      >
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/25 bg-gold/10 text-gold text-xs font-bold uppercase tracking-widest mb-4">
              <Star className="h-3 w-3" />
              Por que escolher a MRM Automóveis
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-black mb-3">
              Nossos <span className="text-gradient-gold">Diferenciais</span>
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Compre com segurança, laudo 100% aprovado e as menores taxas de financiamento de BH.
            </p>
          </FadeIn>

          <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Procedência Garantida",
                desc: "Todos os veículos passam por perícia cautelar completa antes de entrar no nosso estoque. Você compra com total segurança.",
                color: "text-red-400",
                bg: "bg-red-500/10 border-red-500/20",
              },
              {
                icon: BadgeCheck,
                title: "Laudo Aprovado",
                desc: "Revisão mecânica e laudo de transferência inclusos. Documentação 100% regularizada antes da entrega.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
              },
              {
                icon: Handshake,
                title: "Negociação Transparente",
                desc: "Sem letras miúdas ou surpresas. Apresentamos todos os custos de forma clara e honesta desde o primeiro contato.",
                color: "text-blue-400",
                bg: "bg-blue-500/10 border-blue-500/20",
              },
              {
                icon: TrendingUp,
                title: "Melhores Financiamentos",
                desc: "Parceria com os principais bancos do país para garantir as menores taxas e as melhores condições de parcelamento para você.",
                color: "text-amber-400",
                bg: "bg-amber-500/10 border-amber-500/20",
              },
              {
                icon: Car,
                title: "Troca Facilitada",
                desc: "Aceite do seu veículo usado na troca com avaliação justa e imparcial. Simplificamos todo o processo para você.",
                color: "text-purple-400",
                bg: "bg-purple-500/10 border-purple-500/20",
              },
              {
                icon: MessageCircle,
                title: "Suporte Pós-Venda",
                desc: "Nossa relação não termina na venda. Continuamos à disposição para qualquer dúvida ou necessidade após a compra.",
                color: "text-cyan-400",
                bg: "bg-cyan-500/10 border-cyan-500/20",
              },
            ].map((item, i) => (
              <FadeIn key={i}>
                <div className="group relative p-6 rounded-2xl border bg-card/40 backdrop-blur-sm hover:bg-card/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-card cursor-default">
                  <div
                    className={`w-12 h-12 rounded-xl ${item.bg} border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </FadeInStagger>
        </div>
      </section>

      {/* ── VENDA SEU CARRO ── */}
      <SellCarSection whatsappUrl={whatsappUrl} />

      {/* ── CONTATO ── */}
      <section id="contato" className="py-24 border-t border-white/5 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              <Phone className="h-3.5 w-3.5" />
              Canais de Atendimento
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black mb-3">
              Fale com a <span className="text-gradient-primary">MRM Automóveis</span>
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Tire dúvidas sobre veículos, faça uma simulação de financiamento ou venha nos visitar.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Card 1: WhatsApp */}
            <FadeIn delay={0.1}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col p-6 rounded-3xl bg-card/50 border border-white/10 hover:border-[#25D366]/40 hover:bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-card h-full"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center group-hover:scale-110 transition-transform p-3">
                    <WhatsAppLogo className="w-7 h-7 text-[#25D366]" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20">
                    Online agora
                  </span>
                </div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                  WhatsApp Oficial
                </p>
                <p className="font-display font-extrabold text-2xl text-foreground group-hover:text-[#25D366] transition-colors mb-2">
                  {formattedPhone}
                </p>
                <p className="text-xs text-muted-foreground mt-auto">
                  Clique aqui para iniciar uma conversa direta com nossa equipe de vendas.
                </p>
              </a>
            </FadeIn>

            {/* Card 2: Endereço da Loja */}
            <FadeIn delay={0.2}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddress || "Belo Horizonte MG")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col p-6 rounded-3xl bg-card/50 border border-white/10 hover:border-blue-500/40 hover:bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-card h-full"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform p-3">
                    <MapPin className="w-7 h-7 text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Como Chegar
                  </span>
                </div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                  Endereço da Loja
                </p>
                <p className="font-display font-bold text-lg text-foreground group-hover:text-blue-400 transition-colors mb-2 leading-snug">
                  {storeAddress || "Belo Horizonte - MG"}
                </p>
                <p className="text-xs text-muted-foreground mt-auto">
                  Venha tomar um café conosco e conhecer nosso estoque de perto.
                </p>
              </a>
            </FadeIn>

            {/* Card 3: Horário de Funcionamento */}
            <FadeIn delay={0.3}>
              <div className="flex flex-col p-6 rounded-3xl bg-card/50 border border-white/10 h-full">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-13 h-13 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center p-3">
                    <Clock className="w-7 h-7 text-amber-400" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Horários
                  </span>
                </div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">
                  Atendimento Presencial
                </p>
                <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                  <div className="flex justify-between">
                    <span>Segunda a Sexta:</span>
                    <strong className="text-foreground">08:30 às 18:30</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sábados:</span>
                    <strong className="text-foreground">08:30 às 14:00</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Domingos e Feriados:</span>
                    <strong className="text-foreground">Plantão WhatsApp</strong>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground/70 mt-auto">
                  Agendamentos especiais disponíveis via WhatsApp.
                </p>
              </div>
            </FadeIn>
          </div>

          {/* Botão de Destaque WhatsApp */}
          <FadeIn delay={0.4} className="text-center">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-elegant h-16 px-10 rounded-2xl text-base sm:text-lg font-extrabold hover:scale-105 transition-all duration-200 gap-3"
              >
                <WhatsAppLogo className="h-6 w-6" />
                <span>Conversar no WhatsApp: {formattedPhone}</span>
              </Button>
            </a>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-white/5 bg-card/30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <LogoIcon className="w-8 h-8 rounded-lg shadow-elegant" />
              <span className="font-display font-bold text-lg tracking-tight">
                MRM <span className="text-gradient-primary">AUTOMÓVEIS</span>
              </span>
            </Link>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{storeAddress || "Belo Horizonte, MG"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all text-sm font-bold shadow-sm"
            >
              <WhatsAppLogo className="h-4 w-4" />
              <span>{formattedPhone}</span>
            </a>
          </div>

          <div className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MRM AUTOMÓVEIS. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

type VehicleCardProps = {
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number | null;
    photos: string[] | null;
    asking_price: number | null;
    status: string;
    ad_text: string | null;
    mileage: number | null;
    color: string | null;
  };
  whatsappUrl: string;
};

function VehicleCard({ vehicle: v, whatsappUrl }: VehicleCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(v.id);

  return (
    <div className="group relative bg-card/50 border border-white/5 rounded-2xl overflow-hidden hover:border-white/15 hover:shadow-card transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Photo */}
      <Link to="/estoque/$id" params={{ id: v.id }} className="block">
        <div className="aspect-[16/10] bg-muted relative overflow-hidden">
          {v.photos?.[0] ? (
            <img
              src={v.photos[0]}
              alt={`${v.brand} ${v.model}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Car className="h-12 w-12 text-muted-foreground/20" />
            </div>
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <span className="text-white text-sm font-bold">Ver detalhes →</span>
          </div>
          {/* Color badge */}
          {v.color && (
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium z-10 pointer-events-none">
              {v.color}
            </div>
          )}
        </div>
      </Link>

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(v.id);
        }}
        className={cn(
          "absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all z-20",
          favorited
            ? "bg-red-500/90 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-110"
            : "bg-black/40 text-white hover:bg-black/60 hover:scale-110",
        )}
      >
        <Heart className={cn("h-4 w-4", favorited && "fill-current")} />
      </button>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <Link to="/estoque/$id" params={{ id: v.id }}>
          <h3 className="font-display font-bold text-lg leading-tight hover:text-primary transition-colors">
            {v.brand} {v.model}
          </h3>
        </Link>

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-2 mb-4 text-muted-foreground">
          {v.year && (
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              <span>{v.year}</span>
            </div>
          )}
          {v.mileage != null && (
            <div className="flex items-center gap-1 text-xs">
              <Gauge className="h-3 w-3" />
              <span>{v.mileage.toLocaleString("pt-BR")} km</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          <div className="font-display font-black text-2xl text-gradient-primary">
            {brl(v.asking_price || 0)}
          </div>
          <a
            href={`${whatsappUrl}?text=${encodeURIComponent(`Olá! Tenho interesse no ${v.brand} ${v.model} ${v.year ?? ""}. Vi no site da MRM Automóveis.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-200 hover:scale-110"
            title="Perguntar via WhatsApp"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function FavoritesBadge() {
  const { favorites } = useFavorites();
  if (favorites.length === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center animate-in zoom-in">
      {favorites.length}
    </span>
  );
}

type PublicVehicle = VehicleCardProps["vehicle"];

function FavoritesList({
  vehicles,
  whatsappUrl,
}: {
  vehicles: PublicVehicle[];
  whatsappUrl: string;
}) {
  const { favorites, toggleFavorite } = useFavorites();

  if (!vehicles) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  const favoritedVehicles = vehicles.filter((v) => favorites.includes(v.id));

  if (favoritedVehicles.length === 0) {
    return (
      <div className="py-12 text-center flex flex-col items-center">
        <Heart className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground">Você ainda não tem veículos favoritos.</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Clique no coração dos anúncios que você gostar para salvá-los aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
      {favoritedVehicles.map((v) => (
        <div
          key={v.id}
          className="flex gap-4 p-3 bg-muted/30 rounded-xl border border-white/5 relative group"
        >
          <Link
            to="/estoque/$id"
            params={{ id: v.id }}
            className="shrink-0 w-24 h-20 bg-muted rounded-lg overflow-hidden block"
          >
            {v.photos?.[0] ? (
              <img
                src={v.photos[0]}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="h-6 w-6 text-muted-foreground/20" />
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <Link
              to="/estoque/$id"
              params={{ id: v.id }}
              className="font-bold text-base truncate hover:text-primary transition-colors"
            >
              {v.brand} {v.model}
            </Link>
            <div className="text-xs text-muted-foreground mt-0.5 mb-1">
              {v.year} • {v.mileage?.toLocaleString("pt-BR")} km
            </div>
            <div className="font-display font-black text-gradient-primary">
              {brl(v.asking_price || 0)}
            </div>
          </div>
          <div className="flex flex-col gap-2 justify-center shrink-0">
            <a
              href={`${whatsappUrl}?text=${encodeURIComponent(`Olá! Tenho interesse no ${v.brand} ${v.model} ${v.year ?? ""}. Vi na minha lista de favoritos da MRM Automóveis.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <button
              onClick={() => toggleFavorite(v.id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors"
              title="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SellCarSection({ whatsappUrl }: { whatsappUrl: string }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    price: "",
    carInfo: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.carInfo) return;

    setSubmitting(true);
    try {
      await supabase.from("leads").insert({
        name: `${formData.name} (Venda: ${formData.carInfo} | R$ ${formData.price} | ${formData.email})`,
        phone: formData.phone,
        status: "new",
      });
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);

    const text = `Olá! Meu nome é ${formData.name}. Gostaria de vender meu carro (${formData.carInfo}) e vi o anúncio no site da MRM Automóveis.\n\nE-mail: ${formData.email}\nValor Desejado: R$ ${formData.price}`;
    window.open(
      `https://wa.me/${whatsappUrl.split("/").pop()?.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  return (
    <section className="py-24 border-t border-white/5 relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
            <Car className="h-3 w-3" />
            Venda seu veículo
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-black mb-4">
            Quer <span className="text-gradient-primary">vender ou trocar</span> seu carro?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            Nós compramos o seu veículo com avaliação justa, pagamento à vista e muita segurança.
            Preencha os dados abaixo e entraremos em contato.
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <form
            onSubmit={handleSubmit}
            className="bg-card/60 backdrop-blur-md border border-white/10 p-6 sm:p-8 rounded-3xl shadow-elegant text-left max-w-2xl mx-auto"
          >
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Seu Nome</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  className="w-full h-12 bg-background/50 border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">WhatsApp</label>
                <input
                  type="tel"
                  required
                  placeholder="(31) 99999-9999"
                  className="w-full h-12 bg-background/50 border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: joao@email.com"
                  className="w-full h-12 bg-background/50 border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">
                  Valor Desejado (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 85.000,00"
                  className="w-full h-12 bg-background/50 border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  value={formData.price}
                  onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground ml-1">
                Carro que deseja vender (Marca / Modelo / Ano)
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Honda Civic Touring 2020"
                className="w-full h-12 bg-background/50 border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                value={formData.carInfo}
                onChange={(e) => setFormData((p) => ({ ...p, carInfo: e.target.value }))}
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 bg-gradient-primary shadow-elegant rounded-xl text-lg font-bold text-white hover:scale-[1.02] transition-transform"
            >
              {submitting ? "Processando..." : "Quero avaliar meu carro"}
            </Button>
          </form>
        </FadeIn>
      </div>
    </section>
  );
}
