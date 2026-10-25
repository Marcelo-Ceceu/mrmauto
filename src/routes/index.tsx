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
  Play,
  Instagram,
  Heart,
  Trash2,
  Menu,
  ShieldCheck,
  Award,
  CreditCard,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { brl } from "@/lib/format";
import { useState, useMemo } from "react";
import { VehicleFilterValues } from "@/components/VehicleFilters";
import { FadeIn, FadeInStagger } from "@/components/ui/fade-in";
import { Helmet } from "react-helmet";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { extractVideoUrl, parseVideoUrl } from "@/lib/video";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// CNPJ oficial da MRM Automóveis (altere o valor de [PREENCHER] quando tiver o número)
const STORE_CNPJ = "[PREENCHER]";

const autoDealerSchema = {
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  name: "MRM Automóveis",
  image: "https://mrmautomoveis.com.br/og-image.jpg",
  url: "https://mrmautomoveis.com.br",
  telephone: "+55 31 98798-4668",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Av. Raja Gabaglia, 2000",
    addressLocality: "Belo Horizonte",
    addressRegion: "MG",
    addressCountry: "BR",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:30",
      closes: "18:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "08:30",
      closes: "14:00",
    },
  ],
  sameAs: ["https://www.instagram.com/mrmautomoveis"],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MRM Automóveis | Seminovos revisados em Belo Horizonte" },
      {
        name: "description",
        content:
          "Seminovos revisados e periciados em Belo Horizonte. Financiamento facilitado, troca com avaliação justa e documentação regularizada. Av. Raja Gabaglia, 2000 - Estoril.",
      },
      {
        property: "og:title",
        content: "MRM Automóveis | Seminovos revisados em Belo Horizonte",
      },
      {
        property: "og:description",
        content:
          "Seminovos revisados e periciados em Belo Horizonte. Financiamento facilitado, troca com avaliação justa e documentação regularizada. Av. Raja Gabaglia, 2000 - Estoril.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mrmautomoveis.com.br/" },
      { property: "og:image", content: "https://mrmautomoveis.com.br/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "MRM Automóveis | Seminovos revisados em Belo Horizonte",
      },
      {
        name: "twitter:description",
        content:
          "Seminovos revisados e periciados em Belo Horizonte. Financiamento facilitado, troca com avaliação justa e documentação regularizada. Av. Raja Gabaglia, 2000 - Estoril.",
      },
      { name: "twitter:image", content: "https://mrmautomoveis.com.br/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://mrmautomoveis.com.br/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(autoDealerSchema),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const {
    data: vehicles,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["public-vehicles"],
    queryFn: async () => {
      let res = await supabase
        .from("vehicles")
        .select(
          "id, brand, model, year, photos, asking_price, status, ad_text, mileage, color, is_published, video_url",
        )
        .order("created_at", { ascending: false });

      if (res.error && (res.error.code === "42703" || res.error.message.includes("video_url"))) {
        const fallback = await supabase
          .from("vehicles")
          .select(
            "id, brand, model, year, photos, asking_price, status, ad_text, mileage, color, is_published",
          )
          .order("created_at", { ascending: false });

        if (fallback.error) {
          console.error("Error fetching vehicles:", fallback.error);
          throw fallback.error;
        }
        return (fallback.data || []) as any[];
      }

      if (res.error) {
        console.error("Error fetching vehicles:", res.error);
        throw res.error;
      }
      return (res.data || []) as any[];
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
        instagram: map["instagram_url"] || "https://www.instagram.com/mrmautomoveis",
      };
    },
  });

  const rawPhone = storeSettings?.whatsapp || "5531987984668";
  const storeAddress =
    storeSettings?.address || "Av. Raja Gabaglia, 2000 - Estoril, Belo Horizonte - MG";
  const whatsappUrl = `https://wa.me/${rawPhone.replace(/\D/g, "")}`;
  const instagramUrl =
    storeSettings?.instagram || "https://www.instagram.com/mrmautomoveis";

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

  const totalAvailableVehicles = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter(
      (v) => v.is_published === true && (v.status === "available" || v.status === "maintenance"),
    );
  }, [vehicles]);

  const brandCounts = useMemo(() => {
    if (!vehicles) return {};
    const counts: Record<string, number> = {};
    totalAvailableVehicles.forEach((v) => {
      if (v.brand) counts[v.brand] = (counts[v.brand] || 0) + 1;
    });
    return counts;
  }, [totalAvailableVehicles]);

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

  const hasActiveFilters =
    Boolean(filterValues.search) ||
    filterValues.brand !== "all" ||
    Boolean(filterValues.maxPrice) ||
    Boolean(filterValues.maxMileage);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-red-600 selection:text-white font-sans overflow-x-hidden">
      <Helmet>
        <title>MRM Automóveis | Seminovos revisados em Belo Horizonte</title>
        <meta
          name="description"
          content="Seminovos revisados e periciados em Belo Horizonte. Financiamento facilitado, troca com avaliação justa e documentação regularizada. Av. Raja Gabaglia, 2000 - Estoril."
        />
        <link rel="canonical" href="https://mrmautomoveis.com.br/" />
        <meta property="og:title" content="MRM Automóveis | Seminovos revisados em Belo Horizonte" />
        <meta
          property="og:description"
          content="Seminovos revisados e periciados em Belo Horizonte. Financiamento facilitado, troca com avaliação justa e documentação regularizada. Av. Raja Gabaglia, 2000 - Estoril."
        />
        <meta property="og:image" content="https://mrmautomoveis.com.br/og-image.jpg" />
        <meta property="og:url" content="https://mrmautomoveis.com.br/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MRM Automóveis | Seminovos revisados em Belo Horizonte" />
        <meta
          name="twitter:description"
          content="Seminovos revisados e periciados em Belo Horizonte. Financiamento facilitado, troca com avaliação justa e documentação regularizada. Av. Raja Gabaglia, 2000 - Estoril."
        />
        <meta name="twitter:image" content="https://mrmautomoveis.com.br/og-image.jpg" />
        <script type="application/ld+json">
          {JSON.stringify(autoDealerSchema)}
        </script>
      </Helmet>

      {/* ── CABEÇALHO (NAVBAR) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-white/10 text-white transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <LogoIcon className="w-10 h-10 rounded-xl shadow-md border border-white/15 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="font-display font-black text-xl tracking-tight text-white leading-none">
                MRM <span className="text-red-500">AUTOMÓVEIS</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase mt-1">
                Seminovos • BH
              </span>
            </div>
          </Link>

          {/* Navegação Desktop */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-zinc-300">
            <a href="#" className="hover:text-white transition-colors">
              Início
            </a>
            <a href="#estoque" className="hover:text-white transition-colors">
              Estoque
            </a>
            <a href="#financiamento" className="hover:text-white transition-colors">
              Financiamento
            </a>
            <a href="#sobre" className="hover:text-white transition-colors">
              Sobre nós
            </a>
            <a href="#contato" className="hover:text-white transition-colors">
              Contato
            </a>
          </nav>

          {/* Ações / Contato Visível */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Modal de Favoritos */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/15 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-300 hover:text-red-400 relative h-11 w-11 transition-colors"
                  title="Meus Favoritos"
                >
                  <Heart className="h-4 w-4" />
                  <FavoritesBadge />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-white border border-slate-200 text-slate-800 shadow-2xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl font-bold flex items-center gap-2 text-slate-900">
                    <Heart className="h-5 w-5 text-red-500 fill-current" />
                    Meus Veículos Favoritos
                  </DialogTitle>
                </DialogHeader>
                <FavoritesList vehicles={vehicles || []} whatsappUrl={whatsappUrl} />
              </DialogContent>
            </Dialog>

            {/* Botão de WhatsApp em Destaque */}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold gap-2 px-4 h-11 shadow-md shadow-[#25D366]/20 transition-all hover:scale-105"
              >
                <WhatsAppLogo className="h-4 w-4" />
                <span>{formattedPhone}</span>
              </Button>
            </a>

            {/* Acesso Restrito */}
            <Link to="/login">
              <Button
                variant="outline"
                size="sm"
                className="border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl h-11 px-3.5 text-xs font-semibold"
              >
                Acesso Restrito
              </Button>
            </Link>
          </div>

          {/* Botão Hambúrguer Mobile */}
          <div className="flex sm:hidden items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/15 bg-white/5 rounded-xl text-zinc-300 h-10 w-10 relative"
                  title="Favoritos"
                >
                  <Heart className="h-4 w-4" />
                  <FavoritesBadge />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border border-slate-200 text-slate-800 shadow-2xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg font-bold flex items-center gap-2 text-slate-900">
                    <Heart className="h-5 w-5 text-red-500 fill-current" />
                    Favoritos
                  </DialogTitle>
                </DialogHeader>
                <FavoritesList vehicles={vehicles || []} whatsappUrl={whatsappUrl} />
              </DialogContent>
            </Dialog>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-white/5 border border-white/15 text-zinc-300 hover:text-white"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Menu Dropdown Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-zinc-950 px-6 py-6 space-y-4 animate-in slide-in-from-top duration-200">
            <div className="flex flex-col space-y-3 font-semibold text-base text-zinc-200">
              <a
                href="#"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-red-400 transition-colors"
              >
                Início
              </a>
              <a
                href="#estoque"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-red-400 transition-colors"
              >
                Estoque
              </a>
              <a
                href="#financiamento"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-red-400 transition-colors"
              >
                Financiamento
              </a>
              <a
                href="#sobre"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-red-400 transition-colors"
              >
                Sobre nós
              </a>
              <a
                href="#contato"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-red-400 transition-colors"
              >
                Contato
              </a>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold h-12 rounded-xl gap-2 shadow-md">
                  <WhatsAppLogo className="h-5 w-5" />
                  <span>WhatsApp: {formattedPhone}</span>
                </Button>
              </a>

              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full border-pink-500/40 text-pink-400 bg-pink-500/10 hover:bg-pink-500/20 font-bold h-12 rounded-xl gap-2"
                  >
                    <Instagram className="h-5 w-5" />
                    <span>Instagram</span>
                  </Button>
                </a>
              )}

              <Link to="/login" className="w-full">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-zinc-300 hover:text-white h-11 rounded-xl text-sm"
                >
                  Acesso Restrito
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── DESTAQUE PRINCIPAL (HERO ESCURO PREMIUM AUTOMOTIVO) ── */}
      <section className="relative pt-20 bg-zinc-950 text-white min-h-[580px] md:min-h-[660px] flex items-center overflow-hidden">
        {/* Foto ampla e marcante de um carro */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-car.jpg"
            alt="Veículo esportivo moderno"
            className="w-full h-full object-cover object-center md:object-right opacity-45 md:opacity-55 scale-105 transition-transform duration-1000"
          />
          {/* Gradientes sutis para garantir leitura impecável */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/50" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 w-full">
          <div className="max-w-2xl">
            <FadeIn direction="down" distance={15}>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-red-500/30 bg-red-950/40 text-red-400 text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-md">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                Seminovos selecionados em Belo Horizonte
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-5 text-white">
                Seu próximo carro <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-red-400">
                  está aqui.
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.15}>
              <p className="text-zinc-300 text-base sm:text-lg md:text-xl font-normal leading-relaxed mb-8 max-w-xl">
                Qualidade periciada, procedência garantida e transparência absoluta para você realizar o melhor negócio com segurança e tranquilidade.
              </p>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <a href="#estoque">
                  <Button className="w-full sm:w-auto h-14 px-8 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold text-base shadow-xl shadow-red-600/30 transition-all hover:scale-105 gap-2">
                    <Car className="h-5 w-5" />
                    <span>Ver estoque</span>
                  </Button>
                </a>
                <a href="#financiamento">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-14 px-7 border-white/25 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold text-base backdrop-blur-sm transition-all"
                  >
                    Simular financiamento
                  </Button>
                </a>
              </div>
            </FadeIn>

            {/* Micro selos de confiança no Hero */}
            <FadeIn delay={0.25}>
              <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-white/10 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">100% periciados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="font-medium">Garantia na loja</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-medium">Taxas facilitadas</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── BARRA DE BUSCA DE VEÍCULOS (MODERNA E VISÍVEL) ── */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 -mt-8 md:-mt-12">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 p-5 md:p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-red-600" />
              <span className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">
                Busca Rápida de Veículos
              </span>
            </div>
            {hasActiveFilters && (
              <button
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
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Campo Marca */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Marca</label>
              <Select
                value={filterValues.brand}
                onValueChange={(val) => setFilterValues((p) => ({ ...p, brand: val }))}
              >
                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 text-slate-800 rounded-xl text-sm focus:ring-red-500">
                  <SelectValue placeholder="Todas as marcas" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 shadow-xl rounded-xl z-50">
                  <SelectItem value="all">Todas as marcas</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b} {brandCounts[b] ? `(${brandCounts[b]})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo Modelo / Texto */}
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">Modelo</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Ex: Onix, Civic, Renegade, Compass..."
                  className="pl-10 h-12 bg-slate-50 border-slate-200 text-slate-800 rounded-xl text-sm focus:ring-red-500 placeholder:text-slate-400"
                  value={filterValues.search}
                  onChange={(e) => setFilterValues((p) => ({ ...p, search: e.target.value }))}
                />
                {filterValues.search && (
                  <button
                    onClick={() => setFilterValues((p) => ({ ...p, search: "" }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Campo Faixa de Preço */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Faixa de preço</label>
              <Select
                value={filterValues.maxPrice || "all"}
                onValueChange={(val) =>
                  setFilterValues((p) => ({ ...p, maxPrice: val === "all" ? "" : val }))
                }
              >
                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 text-slate-800 rounded-xl text-sm focus:ring-red-500">
                  <SelectValue placeholder="Qualquer valor" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 shadow-xl rounded-xl z-50">
                  <SelectItem value="all">Qualquer valor</SelectItem>
                  <SelectItem value="35000">Até R$ 35.000</SelectItem>
                  <SelectItem value="50000">Até R$ 50.000</SelectItem>
                  <SelectItem value="75000">Até R$ 75.000</SelectItem>
                  <SelectItem value="100000">Até R$ 100.000</SelectItem>
                  <SelectItem value="150000">Até R$ 150.000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão de Busca */}
            <div className="md:col-span-2 flex items-end">
              <a href="#estoque" className="w-full">
                <Button className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-600/20 gap-2 transition-all">
                  <Search className="h-4 w-4" />
                  <span>Buscar</span>
                </Button>
              </a>
            </div>
          </div>

          {/* Chips de Filtros Rápidos */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto text-xs pb-1 custom-scrollbar">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Filtros rápidos:</span>
            <button
              type="button"
              onClick={() =>
                setFilterValues((p) => ({ ...p, maxPrice: "", brand: "all", maxMileage: "" }))
              }
              className={cn(
                "px-3.5 py-1.5 rounded-full border whitespace-nowrap font-medium transition-all",
                !filterValues.maxPrice &&
                  filterValues.brand === "all" &&
                  !filterValues.maxMileage
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200",
              )}
            >
              {isLoading ? "Carregando..." : `Todos (${totalAvailableVehicles.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterValues((p) => ({ ...p, maxPrice: "35000" }))}
              className={cn(
                "px-3.5 py-1.5 rounded-full border whitespace-nowrap font-medium transition-all",
                filterValues.maxPrice === "35000"
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200",
              )}
            >
              Até R$ 35 mil
            </button>
            <button
              type="button"
              onClick={() => setFilterValues((p) => ({ ...p, maxPrice: "50000" }))}
              className={cn(
                "px-3.5 py-1.5 rounded-full border whitespace-nowrap font-medium transition-all",
                filterValues.maxPrice === "50000"
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200",
              )}
            >
              Até R$ 50 mil
            </button>
            <button
              type="button"
              onClick={() => setFilterValues((p) => ({ ...p, maxMileage: "150000" }))}
              className={cn(
                "px-3.5 py-1.5 rounded-full border whitespace-nowrap font-medium transition-all",
                filterValues.maxMileage === "150000"
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200",
              )}
            >
              Até 150.000 km
            </button>
            <button
              type="button"
              onClick={() => setFilterValues((p) => ({ ...p, maxMileage: "80000" }))}
              className={cn(
                "px-3.5 py-1.5 rounded-full border whitespace-nowrap font-medium transition-all",
                filterValues.maxMileage === "80000"
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200",
              )}
            >
              Até 80.000 km
            </button>
            <button
              type="button"
              onClick={() => setFilterValues((p) => ({ ...p, maxMileage: "50000" }))}
              className={cn(
                "px-3.5 py-1.5 rounded-full border whitespace-nowrap font-medium transition-all",
                filterValues.maxMileage === "50000"
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200",
              )}
            >
              Menos de 50.000 km
            </button>
          </div>
        </div>
      </section>

      {/* ── FAIXA DE BENEFÍCIOS (TRANSMITIR CONFIANÇA) ── */}
      <section className="py-14 md:py-20 bg-white border-y border-slate-200/80 mt-12 md:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              Por que a MRM Automóveis?
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
              Compre seu seminovo com tranquilidade absoluta
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Nossa prioridade é sua segurança e satisfação em cada etapa da negociação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Benefício 1 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-7 hover:border-red-300 hover:bg-white hover:shadow-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-xl text-slate-900 mb-2">
                Procedência verificada
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Todos os veículos passam por rigorosa perícia cautelar e checagem de histórico. Você compra com laudo e garantia de procedência 100% aprovados.
              </p>
            </div>

            {/* Benefício 2 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-7 hover:border-red-300 hover:bg-white hover:shadow-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-xl text-slate-900 mb-2">
                Financiamento facilitado
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Parceria direta com os maiores bancos do país. Condições facilitadas, taxas competitivas e parcelas que se ajustam ao seu planejamento financeiro.
              </p>
            </div>

            {/* Benefício 3 */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-7 hover:border-red-300 hover:bg-white hover:shadow-lg transition-all duration-300 group">
              <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Handshake className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-xl text-slate-900 mb-2">
                Atendimento de confiança
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Negociação transparente do primeiro contato ao pós-venda. Avaliação justa do seu carro na troca, sem letras miúdas e sem burocracia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO: DESTAQUES DO ESTOQUE ── */}
      <section id="estoque" className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 uppercase tracking-widest mb-2">
                <Flame className="h-4 w-4" />
                Estoque Selecionado
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Destaques do estoque
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-1">
                Encontre o modelo perfeito para você, revisado e pronto para entrega imediata.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Contador de Veículos */}
              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 shadow-sm flex items-center gap-2">
                <Car className="h-4 w-4 text-red-600" />
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                    Carregando estoque...
                  </span>
                ) : isError ? (
                  <span>Estoque temporariamente indisponível</span>
                ) : (
                  <span>
                    <strong className="text-slate-900 font-bold">{filteredVehicles.length}</strong>{" "}
                    {filteredVehicles.length === 1 ? "veículo disponível" : "veículos disponíveis"}
                  </span>
                )}
              </div>

              {/* Ordenação */}
              <div className="flex items-center gap-2">
                <Select
                  value={sortBy}
                  onValueChange={(val: "recent" | "price-asc" | "price-desc" | "km-asc") =>
                    setSortBy(val)
                  }
                >
                  <SelectTrigger className="w-[180px] h-10 bg-white border-slate-200 text-slate-800 text-xs rounded-xl shadow-sm focus:ring-red-500">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    <SelectValue placeholder="Mais recentes" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-800 text-xs shadow-xl rounded-xl z-50">
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="price-asc">Menor preço</SelectItem>
                    <SelectItem value="price-desc">Maior preço</SelectItem>
                    <SelectItem value="km-asc">Menor quilometragem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Grid de Veículos */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => <VehicleCardSkeleton key={i} />)}

            {isError && (
              <div className="col-span-full text-center py-16 px-6 bg-white rounded-2xl border border-red-200 shadow-sm max-w-xl mx-auto">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                  <Car className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900 mb-2">
                  Ops! Ocorreu um problema ao carregar
                </h3>
                <p className="text-slate-600 text-sm mb-6">
                  Não foi possível carregar o estoque agora. Tente novamente ou fale conosco no WhatsApp.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={() => refetch()}
                    variant="outline"
                    className="border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl w-full sm:w-auto"
                  >
                    Tentar novamente
                  </Button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto"
                  >
                    <Button className="bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold w-full gap-2 shadow-sm">
                      <WhatsAppLogo className="h-4 w-4" />
                      Falar no WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {!isLoading &&
              !isError &&
              filteredVehicles.length > 0 &&
              filteredVehicles.map((v) => (
                <VehicleCard key={v.id} vehicle={v} whatsappUrl={whatsappUrl} />
              ))}

            {!isLoading &&
              !isError &&
              totalAvailableVehicles.length === 0 && (
                <div className="col-span-full text-center py-16 px-6 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto">
                  <Car className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-display font-bold text-xl text-slate-900 mb-2">
                    Novos veículos chegando em breve!
                  </h3>
                  <p className="text-slate-600 text-sm mb-6">
                    Nosso estoque está sendo abastecido com novas opções selecionadas e periciadas. Entre em contato para saber em primeira mão quais veículos estão chegando.
                  </p>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold gap-2 shadow-md">
                      <WhatsAppLogo className="h-4 w-4" />
                      Consultar veículos no WhatsApp
                    </Button>
                  </a>
                </div>
              )}

            {!isLoading &&
              !isError &&
              totalAvailableVehicles.length > 0 &&
              filteredVehicles.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto px-6">
                  <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-display font-bold text-lg text-slate-900 mb-1">
                    Nenhum veículo encontrado
                  </h3>
                  <p className="text-slate-600 text-sm mb-5">
                    Tente ajustar seus termos de busca ou utilize outros filtros de preço e marca.
                  </p>
                  <Button
                    variant="outline"
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
                    className="border-slate-300 text-slate-700 rounded-xl"
                  >
                    Limpar todos os filtros
                  </Button>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* ── SEÇÃO: FINANCIAMENTO FACILITADO ── */}
      <section id="financiamento" className="py-16 md:py-24 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-black rounded-3xl p-8 sm:p-12 md:p-16 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-2xl relative z-10">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
                <CreditCard className="h-3.5 w-3.5" />
                Financiamento sem complicação
              </span>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
                Condições facilitadas de financiamento
              </h2>
              <p className="text-zinc-300 text-base sm:text-lg mb-8 leading-relaxed">
                Trabalhamos com os principais bancos para garantir as menores taxas, aprovação rápida e parcelas que cabem com conforto no seu bolso.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-sm">
                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-bold">Aprovação Rápida</strong>
                    <span className="text-zinc-400 text-xs">Simulação 100% online em poucos minutos.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-bold">Até 60 Meses</strong>
                    <span className="text-zinc-400 text-xs">Prazos estendidos com parcelas fixas.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-bold">Entrada Flexível</strong>
                    <span className="text-zinc-400 text-xs">Aceitamos seu veículo usado como entrada.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-bold">Principais Bancos</strong>
                    <span className="text-zinc-400 text-xs">Santander, BV, Itaú, Bradesco e PAN.</span>
                  </div>
                </div>
              </div>

              <a
                href={`${whatsappUrl}?text=${encodeURIComponent("Olá! Gostaria de fazer uma simulação de financiamento na MRM Automóveis.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="h-14 px-8 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-extrabold text-base shadow-lg shadow-[#25D366]/25 transition-all hover:scale-105 gap-2.5">
                  <WhatsAppLogo className="h-5 w-5" />
                  <span>Simular Financiamento no WhatsApp</span>
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO: SOBRE NÓS / DIFERENCIAIS ── */}
      <section id="sobre" className="py-16 md:py-24 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              Sobre a MRM Automóveis
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
              Tradição e transparência em Belo Horizonte
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Localizada na tradicional Av. Raja Gabaglia, a MRM Automóveis é referência em atendimento transparente e veículos periciados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Procedência Garantida",
                desc: "Todos os veículos passam por rigorosa perícia cautelar antes de entrarem no estoque. Você compra com total segurança e histórico limpo.",
                color: "text-red-600",
                bg: "bg-red-50 border-red-200",
              },
              {
                icon: BadgeCheck,
                title: "Laudo Aprovado",
                desc: "Revisão mecânica e laudo de transferência inclusos. Documentação 100% regularizada antes da entrega das chaves.",
                color: "text-emerald-600",
                bg: "bg-emerald-50 border-emerald-200",
              },
              {
                icon: Handshake,
                title: "Negociação Transparente",
                desc: "Sem letras miúdas, taxas ocultas ou surpresas. Apresentamos todos os custos de forma clara e honesta desde o início.",
                color: "text-blue-600",
                bg: "bg-blue-50 border-blue-200",
              },
              {
                icon: TrendingUp,
                title: "Condições Facilitadas",
                desc: "Parceria com as maiores instituições financeiras do Brasil para garantir aprovação rápida e parcelas sob medida.",
                color: "text-amber-600",
                bg: "bg-amber-50 border-amber-200",
              },
              {
                icon: Car,
                title: "Avaliação Justa na Troca",
                desc: "Aceitamos o seu veículo usado como parte do pagamento com avaliação realista, justa e sem desvalorizações abusivas.",
                color: "text-purple-600",
                bg: "bg-purple-50 border-purple-200",
              },
              {
                icon: MessageCircle,
                title: "Suporte Pós-Venda",
                desc: "Nosso relacionamento continua após a compra. Nossa equipe está sempre à disposição para orientar e prestar suporte quando precisar.",
                color: "text-rose-600",
                bg: "bg-rose-50 border-rose-200",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${item.bg} border flex items-center justify-center mb-4`}
                >
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEÇÃO: QUER VENDER OU TROCAR SEU CARRO? ── */}
      <SellCarSection whatsappUrl={whatsappUrl} />

      {/* ── SEÇÃO: CANAIS DE ATENDIMENTO & LOCALIZAÇÃO ── */}
      <section id="contato" className="py-16 md:py-24 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              Fale Conosco
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
              Canais de Atendimento
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Venha tomar um café conosco ou tire todas as suas dúvidas diretamente pelo WhatsApp.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Card WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col p-7 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-[#25D366] hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <WhatsAppLogo className="w-6 h-6 text-[#25D366]" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Online agora
                </span>
              </div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                WhatsApp Oficial
              </span>
              <span className="font-display font-extrabold text-2xl text-slate-900 group-hover:text-emerald-600 transition-colors mb-2">
                {formattedPhone}
              </span>
              <p className="text-xs text-slate-500 mt-auto">
                Clique para conversar diretamente com nossa equipe de vendas.
              </p>
            </a>

            {/* Card Endereço */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddress || "Belo Horizonte MG")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col p-7 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Como Chegar
                </span>
              </div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                Endereço da Loja
              </span>
              <span className="font-display font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors mb-2 leading-snug">
                {storeAddress || "Av. Raja Gabaglia, 2000 - Estoril, Belo Horizonte - MG"}
              </span>
              <p className="text-xs text-slate-500 mt-auto">
                Venha nos visitar e conferir nosso estoque de perto.
              </p>
            </a>

            {/* Card Horários */}
            <div className="flex flex-col p-7 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Funcionamento
                </span>
              </div>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-3">
                Horários de Atendimento
              </span>
              <div className="space-y-1.5 text-xs text-slate-600 mb-2">
                <div className="flex justify-between">
                  <span>Segunda a Sexta:</span>
                  <strong className="text-slate-900 font-bold">08:30 às 18:30</strong>
                </div>
                <div className="flex justify-between">
                  <span>Sábados:</span>
                  <strong className="text-slate-900 font-bold">08:30 às 14:00</strong>
                </div>
                <div className="flex justify-between">
                  <span>Domingos e Feriados:</span>
                  <strong className="text-emerald-600 font-bold">Plantão WhatsApp</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Botões Centrais */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-lg shadow-[#25D366]/20 h-14 px-8 rounded-xl text-base font-extrabold hover:scale-105 transition-all gap-2.5"
              >
                <WhatsAppLogo className="h-5 w-5" />
                <span>Conversar no WhatsApp: {formattedPhone}</span>
              </Button>
            </a>
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 hover:opacity-95 text-white shadow-md h-14 px-7 rounded-xl text-base font-extrabold hover:scale-105 transition-all gap-2.5"
                >
                  <Instagram className="h-5 w-5" />
                  <span>Instagram</span>
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── RODAPÉ (FOOTER) ── */}
      <footer className="py-12 bg-zinc-950 text-zinc-400 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <LogoIcon className="w-8 h-8 rounded-lg shadow-sm border border-white/10" />
              <span className="font-display font-bold text-lg tracking-tight text-white">
                MRM <span className="text-red-500">AUTOMÓVEIS</span>
              </span>
            </Link>
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <span>{storeAddress || "Av. Raja Gabaglia, 2000 - Estoril, Belo Horizonte - MG"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-emerald-400 hover:bg-[#25D366] hover:text-white transition-all text-xs font-bold"
            >
              <WhatsAppLogo className="h-3.5 w-3.5" />
              <span>{formattedPhone}</span>
            </a>
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-pink-400 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-600 hover:text-white transition-all text-xs font-bold"
              >
                <Instagram className="h-3.5 w-3.5" />
                <span>Instagram</span>
              </a>
            )}
          </div>

          <div className="flex flex-col items-center md:items-end gap-1 text-xs text-zinc-500">
            <span className="text-zinc-400 font-medium">MRM Automóveis - CNPJ: {STORE_CNPJ}</span>
            <span>&copy; {new Date().getFullYear()} MRM AUTOMÓVEIS. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function VehicleCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm animate-pulse">
      <div className="aspect-[16/10] bg-slate-200" />
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="h-5 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-12" />
          </div>
          <div className="flex gap-3">
            <div className="h-3.5 bg-slate-100 rounded w-16" />
            <div className="h-3.5 bg-slate-100 rounded w-14" />
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
          <div className="h-7 bg-slate-200 rounded w-1/2" />
          <div className="h-10 bg-slate-100 rounded-xl w-full" />
        </div>
      </div>
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
    video_url?: string | null;
    mileage: number | null;
    color: string | null;
  };
  whatsappUrl: string;
};

function VehicleCard({ vehicle: v, whatsappUrl }: VehicleCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(v.id);
  const videoInfo = parseVideoUrl(extractVideoUrl(v));

  return (
    <div className="group relative bg-white border border-slate-200/90 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Foto com proporção e hover */}
      <Link to="/estoque/$id" params={{ id: v.id }} className="block">
        <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
          {v.photos?.[0] ? (
            <img
              src={v.photos[0]}
              alt={`${v.brand} ${v.model}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
              <Car className="h-12 w-12 text-slate-300" />
            </div>
          )}

          {/* Overlay de hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <span className="text-white text-xs font-bold bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              Ver detalhes do veículo →
            </span>
          </div>

          {/* Badges superiores na foto */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 pointer-events-none">
            {videoInfo && (
              <div
                className={cn(
                  "px-2 py-0.5 rounded-full backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1 shadow-sm",
                  videoInfo.type === "instagram"
                    ? "bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600"
                    : "bg-red-600/95",
                )}
              >
                {videoInfo.type === "instagram" ? (
                  <Instagram className="w-2.5 h-2.5" />
                ) : (
                  <Play className="w-2.5 h-2.5 fill-current" />
                )}
                <span>{videoInfo.type === "instagram" ? "Reels" : "Vídeo"}</span>
              </div>
            )}
            {v.color && (
              <div className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium shadow-sm">
                {v.color}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Botão de Favoritar (Coração) */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(v.id);
        }}
        className={cn(
          "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all z-20 shadow-sm",
          favorited
            ? "bg-red-500 text-white shadow-red-500/30 scale-110"
            : "bg-white/85 text-slate-700 hover:bg-white hover:text-red-500 hover:scale-110",
        )}
        title={favorited ? "Remover dos favoritos" : "Salvar como favorito"}
      >
        <Heart className={cn("h-4 w-4", favorited && "fill-current text-white")} />
      </button>

      {/* Conteúdo textual do card */}
      <div className="p-5 flex flex-col flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          {v.brand}
        </div>
        <Link to="/estoque/$id" params={{ id: v.id }}>
          <h3 className="font-display font-bold text-lg text-slate-900 leading-tight group-hover:text-red-600 transition-colors line-clamp-1">
            {v.model}
          </h3>
        </Link>

        {/* Informações: Ano e KM */}
        <div className="flex items-center gap-4 mt-3 mb-5 text-slate-500">
          {v.year && (
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{v.year}</span>
            </div>
          )}
          {v.mileage != null && (
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Gauge className="h-3.5 w-3.5 text-slate-400" />
              <span>{v.mileage.toLocaleString("pt-BR")} km</span>
            </div>
          )}
        </div>

        {/* Preço e Botão WhatsApp */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
          <div>
            <span className="block text-[11px] text-slate-400 uppercase font-semibold">Valor à vista</span>
            <div className="font-display font-black text-2xl text-red-600">
              {brl(v.asking_price || 0)}
            </div>
          </div>
          <a
            href={`${whatsappUrl}?text=${encodeURIComponent(`Olá! Tenho interesse no ${v.brand} ${v.model} ${v.year ?? ""}. Vi no site da MRM Automóveis.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all duration-200 hover:scale-110 shadow-sm"
            title="Negociar via WhatsApp"
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
    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center animate-in zoom-in">
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

  if (!vehicles) return <div className="py-8 text-center text-slate-500">Carregando...</div>;

  const favoritedVehicles = vehicles.filter((v) => favorites.includes(v.id));

  if (favoritedVehicles.length === 0) {
    return (
      <div className="py-12 text-center flex flex-col items-center">
        <Heart className="h-12 w-12 text-slate-200 mb-3" />
        <p className="text-slate-800 font-semibold">Nenhum veículo favoritado ainda</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Clique no ícone de coração dos anúncios que você gostar para comparar e consultar mais rápido.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
      {favoritedVehicles.map((v) => (
        <div
          key={v.id}
          className="flex gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 relative group items-center"
        >
          <Link
            to="/estoque/$id"
            params={{ id: v.id }}
            className="shrink-0 w-24 h-20 bg-slate-200 rounded-lg overflow-hidden block"
          >
            {v.photos?.[0] ? (
              <img
                src={v.photos[0]}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="h-6 w-6 text-slate-300" />
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to="/estoque/$id"
              params={{ id: v.id }}
              className="font-bold text-base text-slate-900 truncate block hover:text-red-600 transition-colors"
            >
              {v.brand} {v.model}
            </Link>
            <div className="text-xs text-slate-500 mt-0.5 mb-1">
              {v.year} • {v.mileage?.toLocaleString("pt-BR")} km
            </div>
            <div className="font-display font-black text-red-600 text-lg">
              {brl(v.asking_price || 0)}
            </div>
          </div>
          <div className="flex flex-col gap-2 justify-center shrink-0">
            <a
              href={`${whatsappUrl}?text=${encodeURIComponent(`Olá! Tenho interesse no ${v.brand} ${v.model} ${v.year ?? ""}. Vi na minha lista de favoritos da MRM Automóveis.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-colors"
              title="Conversar no WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <button
              onClick={() => toggleFavorite(v.id)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
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

    const text = `Olá! Meu nome é ${formData.name}. Gostaria de avaliar meu carro (${formData.carInfo}) para venda/troca na MRM Automóveis.\n\nE-mail: ${formData.email}\nValor Desejado: R$ ${formData.price}`;
    window.open(
      `https://wa.me/${whatsappUrl.split("/").pop()?.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  return (
    <section className="py-16 md:py-24 bg-white border-t border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <span className="text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200 px-3 py-1 rounded-full">
          Avaliação e Troca
        </span>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mt-3 mb-3">
          Quer <span className="text-red-600">vender ou trocar</span> seu veículo?
        </h2>
        <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto mb-10">
          Compramos o seu seminovo com avaliação justa, pagamento seguro e processo transparente. Preencha os dados e receba nosso contato.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-50 border border-slate-200 p-6 sm:p-10 rounded-3xl shadow-lg text-left max-w-2xl mx-auto"
        >
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">Seu Nome *</label>
              <input
                type="text"
                required
                placeholder="Ex: João Silva"
                className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">WhatsApp *</label>
              <input
                type="tel"
                required
                placeholder="(31) 99999-9999"
                className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">E-mail</label>
              <input
                type="email"
                placeholder="Ex: joao@email.com"
                className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">Valor Desejado (R$)</label>
              <input
                type="text"
                placeholder="Ex: 85.000,00"
                className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                value={formData.price}
                onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5 mb-6">
            <label className="text-xs font-bold text-slate-700 ml-1">
              Veículo (Marca / Modelo / Ano / Versão) *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Honda Civic Touring 1.5 Turbo 2020"
              className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              value={formData.carInfo}
              onChange={(e) => setFormData((p) => ({ ...p, carInfo: e.target.value }))}
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-13 bg-red-600 hover:bg-red-700 text-white rounded-xl text-base font-bold shadow-lg shadow-red-600/25 transition-all hover:scale-[1.01]"
          >
            {submitting ? "Processando envio..." : "Quero avaliar meu veículo"}
          </Button>
        </form>
      </div>
    </section>
  );
}
