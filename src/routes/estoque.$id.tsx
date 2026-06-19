import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Car,
  Calendar,
  Gauge,
  Palette,
  Fuel,
  Settings2,
  MessageCircle,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Heart,
} from "lucide-react";
import { brl } from "@/lib/format";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { Helmet } from "react-helmet";
import { LogoIcon } from "@/components/LogoIcon";

export const Route = createFileRoute("/estoque/$id")({
  loader: async ({ params }) => await fetchPublicVehicle(params.id),
  head: ({ loaderData }) => {
    const vehicle = loaderData;
    if (!vehicle) {
      return {
        meta: [{ title: "Veículo não encontrado — MRM Automóveis" }],
      };
    }
    const title = `${vehicle.brand} ${vehicle.model} ${vehicle.year} — MRM Automóveis`;
    const description = `Confira o ${vehicle.brand} ${vehicle.model} ${vehicle.year} na MRM Automóveis. Cor ${vehicle.color}, ${vehicle.fuel}, ${vehicle.transmission}. Preço: R$ ${vehicle.asking_price?.toLocaleString("pt-BR") || "Sob consulta"}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(vehicle.photos?.[0] ? [{ property: "og:image", content: vehicle.photos[0] }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        ...(vehicle.photos?.[0] ? [{ name: "twitter:image", content: vehicle.photos[0] }] : []),
      ],
    };
  },
  component: PublicVehicleDetail,
});

async function fetchPublicVehicle(id: string) {
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "id, brand, model, year, mileage, color, fuel, transmission, photos, status, asking_price, ad_text",
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

function PublicVehicleDetail() {
  const { id } = Route.useParams();
  const vehicle = Route.useLoaderData();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(id);
  
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "" });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  useEffect(() => {
    setSelectedPhotoIndex(0);
    setIsPhotoModalOpen(false);
  }, [id]);

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

  useEffect(() => {
    if (!isPhotoModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setSelectedPhotoIndex((prev) =>
          prev > 0 ? prev - 1 : vehicle?.photos?.length ? vehicle.photos.length - 1 : 0,
        );
      } else if (e.key === "ArrowRight") {
        setSelectedPhotoIndex((prev) =>
          vehicle?.photos?.length && prev < vehicle.photos.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "Escape") {
        setIsPhotoModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPhotoModalOpen, vehicle?.photos?.length]);

  const handleContact = () => {
    setIsLeadModalOpen(true);
  };

  const submitLeadAndRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !leadForm.name || !leadForm.phone) return;
    
    setIsSubmittingLead(true);
    
    // Save lead to Supabase
    try {
      await supabase.from("leads").insert({
        name: leadForm.name,
        phone: leadForm.phone,
        vehicle_id: id,
        status: "new"
      });
    } catch (err) {
      console.error("Error saving lead:", err);
    }
    
    setIsSubmittingLead(false);
    setIsLeadModalOpen(false);

    // Redirect to WhatsApp
    const price = brl(vehicle.asking_price || 0);
    const text = `Olá! Meu nome é ${leadForm.name} e tenho interesse no ${vehicle.brand} ${vehicle.model} (${vehicle.year}) que vi no site da MRM Automóveis.\n\nPreço: ${price}\nLink: ${window.location.href}`;
    const phone = whatsappSetting || "5531987984668";
    window.open(
      `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  if (!vehicle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Car className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h1 className="text-2xl font-bold">Veículo não encontrado</h1>
        <p className="text-muted-foreground mt-2">
          O veículo que você procura não está mais disponível ou não existe.
        </p>
        <Link to="/" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o início
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium text-sm hidden sm:inline">Voltar ao estoque</span>
          </Link>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link to="/" hash="estoque" className="hover:text-primary transition-colors">
                Estoque
              </Link>
              <Link to="/" hash="contato" className="hover:text-primary transition-colors">
                Contato
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleFavorite(id)}
                className={cn(
                  "p-2 rounded-xl transition-all border",
                  favorited 
                    ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20" 
                    : "bg-card border-white/5 hover:bg-white/5 text-muted-foreground hover:text-foreground"
                )}
                title={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart className={cn("h-5 w-5", favorited && "fill-current")} />
              </button>
              <LogoIcon className="w-8 h-8 rounded-lg" />
              <span className="font-display font-bold text-lg tracking-tight">
                MRM <span className="text-red-600">AUTOMÓVEIS</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div
              className="aspect-[16/10] bg-muted rounded-2xl overflow-hidden shadow-elegant cursor-zoom-in group relative"
              onClick={() => {
                setSelectedPhotoIndex(0);
                setIsPhotoModalOpen(true);
              }}
            >
              {vehicle.photos?.[0] ? (
                <>
                  <img
                    src={vehicle.photos[0]}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="text-white h-10 w-10" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="h-20 w-20 text-muted-foreground/20" />
                </div>
              )}
            </div>

            {vehicle.photos && vehicle.photos.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {vehicle.photos.map((photo, i) => (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group relative transition-all",
                      selectedPhotoIndex === i
                        ? "ring-2 ring-primary ring-offset-2"
                        : "hover:opacity-80",
                    )}
                    onClick={() => {
                      setSelectedPhotoIndex(i);
                      // On mobile we might want to open modal directly, but on desktop just select
                      if (window.innerWidth < 768) setIsPhotoModalOpen(true);
                    }}
                  >
                    <img
                      src={photo}
                      alt={`${vehicle.brand} ${vehicle.model} - ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
              <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/90 shadow-none overflow-hidden flex items-center justify-center">
                <div className="relative w-full h-full flex items-center justify-center group">
                  {vehicle.photos?.[selectedPhotoIndex] && (
                    <img
                      src={vehicle.photos[selectedPhotoIndex]}
                      className="max-w-full max-h-[90vh] object-contain select-none"
                      alt={`${vehicle.brand} ${vehicle.model}`}
                    />
                  )}

                  {vehicle.photos && vehicle.photos.length > 1 && (
                    <>
                      <button
                        className="absolute left-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoIndex((prev) =>
                            prev > 0 ? prev - 1 : vehicle.photos!.length - 1,
                          );
                        }}
                        aria-label="Foto anterior"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        className="absolute right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoIndex((prev) =>
                            prev < vehicle.photos!.length - 1 ? prev + 1 : 0,
                          );
                        }}
                        aria-label="Próxima foto"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 text-white text-sm rounded-full">
                        {selectedPhotoIndex + 1} / {vehicle.photos.length}
                      </div>
                    </>
                  )}
                  <button
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                    onClick={() => setIsPhotoModalOpen(false)}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Lead Modal */}
            <Dialog open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Falar com Corretor</DialogTitle>
                  <DialogDescription>
                    Por favor, informe seu nome e telefone para que possamos oferecer um atendimento personalizado.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={submitLeadAndRedirect} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Seu Nome</Label>
                    <Input
                      id="name"
                      placeholder="Ex: João Silva"
                      required
                      value={leadForm.name}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp</Label>
                    <Input
                      id="phone"
                      placeholder="(31) 99999-9999"
                      required
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary" disabled={isSubmittingLead}>
                    {isSubmittingLead ? "Redirecionando..." : "Iniciar Conversa no WhatsApp"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                  {vehicle.year}
                </Badge>
                {vehicle.status === "maintenance" && (
                  <Badge variant="destructive">Em Manutenção</Badge>
                )}
              </div>
              <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight">
                {vehicle.brand} {vehicle.model}
              </h1>
              <p className="text-2xl lg:text-3xl font-display font-bold text-primary mt-4">
                {brl(vehicle.asking_price || 0)}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailItem
                icon={<Calendar className="h-4 w-4" />}
                label="Ano"
                value={vehicle.year?.toString() || "—"}
              />
              <DetailItem
                icon={<Gauge className="h-4 w-4" />}
                label="Km"
                value={vehicle.mileage ? `${vehicle.mileage.toLocaleString("pt-BR")} km` : "—"}
              />
              <DetailItem
                icon={<Palette className="h-4 w-4" />}
                label="Cor"
                value={vehicle.color || "—"}
              />
              <DetailItem
                icon={<Fuel className="h-4 w-4" />}
                label="Combustível"
                value={vehicle.fuel || "—"}
              />
              <DetailItem
                icon={<Settings2 className="h-4 w-4" />}
                label="Câmbio"
                value={vehicle.transmission || "—"}
              />
            </div>

            <Button
              size="lg"
              className="w-full bg-gradient-primary h-14 text-lg shadow-elegant"
              onClick={handleContact}
            >
              <MessageCircle className="mr-2 h-5 w-5" /> Falar com Corretor
            </Button>

            {vehicle.ad_text && (
              <div className="space-y-3 pt-6 border-t">
                <h2 className="font-display text-xl font-bold">Descrição</h2>
                <div className="bg-muted/30 p-6 rounded-2xl text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {vehicle.ad_text}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border p-3 rounded-xl space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
