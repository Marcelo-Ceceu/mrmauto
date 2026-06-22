import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/LogoIcon";
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
} from "lucide-react";
import { brl } from "@/lib/format";
import { useState, useMemo } from "react";
import { VehicleFilters, VehicleFilterValues } from "@/components/VehicleFilters";
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

  const { data: whatsappSetting } = useQuery({
    queryKey: ["whatsapp-setting"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "whatsapp_number")
        .single();
      return data?.value || "5531987984668";
    },
  });

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];

    return vehicles.filter((v) => {
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
  }, [vehicles, filterValues]);

  const brands = useMemo(() => {
    if (!vehicles) return [];
    const uniqueBrands = Array.from(new Set(vehicles.map((v) => v.brand))).filter(
      Boolean,
    ) as string[];
    return uniqueBrands.sort();
  }, [vehicles]);

  const whatsappUrl = `https://wa.me/${whatsappSetting || "5531987984668"}`;

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
                className="hidden sm:flex bg-gradient-primary shadow-elegant text-white hover:opacity-90 transition-opacity rounded-xl"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
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

      {/* ── HERO ── */}
      <section className="relative pt-36 pb-32 lg:pt-48 lg:pb-56 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10 bg-gradient-hero" />
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[140px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gold/6 rounded-full blur-[100px] animate-float [animation-delay:3s]" />
        </div>
        {/* Grid pattern */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 text-center">
          <FadeIn direction="down" distance={20}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Novidades em estoque toda semana
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight mb-8 leading-[1.05]">
              Seu próximo <span className="text-gradient-primary italic text-glow-red">carro</span>
              <br />
              está aqui!
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              Qualidade, transparência e as melhores condições de financiamento do mercado. Sua
              jornada para o veículo perfeito começa aqui.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-primary shadow-elegant h-14 px-10 rounded-2xl text-lg font-bold hover:scale-105 transition-transform duration-200 text-white"
                asChild
              >
                <a href="#estoque">
                  Explorar estoque <ChevronRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-10 rounded-2xl text-lg font-bold border-white/10 hover:bg-white/5 hover:border-white/20"
                asChild
              >
                <a href="#contato">Falar com corretor</a>
              </Button>
            </div>
          </FadeIn>

          {/* Stats bar */}
          <FadeIn delay={0.5}>
            <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              {[
                { value: "100%", label: "Procedência" },
                { value: "5★", label: "Avaliação" },
                { value: "BH", label: "Localização" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-2xl font-black text-gradient-primary">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── DIFERENCIAIS / SOBRE ── */}
      <section id="sobre" className="py-28 relative border-t border-white/5">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/3 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/25 bg-gold/10 text-gold text-xs font-bold uppercase tracking-widest mb-6">
              <Star className="h-3 w-3" />
              Por que escolher a MRM
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-black mb-4">
              Nossos <span className="text-gradient-gold">Diferenciais</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Mais do que vender carros — oferecemos uma experiência completa e segura do início ao
              fim.
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
                <div
                  className={`group relative p-6 rounded-2xl border bg-card/40 backdrop-blur-sm hover:bg-card/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-card cursor-default`}
                >
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

      {/* ── ESTOQUE ── */}
      <section id="estoque" className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-black mb-2">
                Nosso <span className="text-gradient-primary">Estoque</span>
              </h2>
              <p className="text-muted-foreground">
                Veículos selecionados, revisados e prontos para você.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/60 px-4 py-2 rounded-full border border-white/10">
              <Car className="h-4 w-4 text-primary" />
              <span className="font-bold text-foreground">{filteredVehicles.length}</span>{" "}
              {filteredVehicles.length === 1 ? "veículo disponível" : "veículos disponíveis"}
            </div>
          </FadeIn>

          <VehicleFilters brands={brands} onFilterChange={setFilterValues} />

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
                <p className="text-muted-foreground mb-4">
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
                  className="border-white/10 hover:bg-white/5"
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── VENDA SEU CARRO ── */}
      <SellCarSection whatsappUrl={whatsappUrl} />

      {/* ── CONTATO ── */}
      <section id="contato" className="py-28 border-t border-white/5 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-black mb-4">
              Vamos <span className="text-gradient-primary">conversar?</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Entre em contato agora e encontre o carro dos seus sonhos com a nossa ajuda.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[
              {
                icon: MessageCircle,
                label: "WhatsApp",
                value: "(31) 98798-4668",
                href: whatsappUrl,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
              },
              {
                icon: MapPin,
                label: "Localização",
                value: "Belo Horizonte, MG",
                href: "https://maps.google.com/?q=Belo+Horizonte",
                color: "text-blue-400",
                bg: "bg-blue-500/10 border-blue-500/20",
              },
              {
                icon: Phone,
                label: "Telefone",
                value: "(31) 98798-4668",
                href: "tel:+5531987984668",
                color: "text-amber-400",
                bg: "bg-amber-500/10 border-amber-500/20",
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <a
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center text-center p-6 rounded-2xl bg-card/40 border border-white/5 hover:bg-card/70 hover:border-white/10 transition-all duration-300 hover:-translate-y-1"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${item.bg} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                    {item.label}
                  </p>
                  <p className="font-bold text-foreground">{item.value}</p>
                </a>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.3} className="text-center">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-gradient-primary shadow-elegant h-16 px-14 rounded-2xl text-lg font-bold hover:scale-105 transition-transform duration-200 text-white"
              >
                <MessageCircle className="mr-3 h-6 w-6" />
                Iniciar conversa no WhatsApp
              </Button>
            </a>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 border-t border-white/5 bg-card/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoIcon className="w-8 h-8 rounded-lg shadow-elegant" />
            <span className="font-display font-bold text-lg tracking-tight">
              MRM <span className="text-gradient-primary">AUTOMÓVEIS</span>
            </span>
          </Link>
          <div className="text-sm text-muted-foreground">
            &copy; 2026 MRM AUTOMÓVEIS. Todos os direitos reservados.
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

function FavoritesList({ vehicles, whatsappUrl }: { vehicles: any[]; whatsappUrl: string }) {
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
