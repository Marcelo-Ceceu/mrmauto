import { useState, useEffect, type ReactNode } from "react";
import {
  Upload,
  X,
  Calculator,
  Search as SearchIcon,
  Percent,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { FipeModal } from "./FipeModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { brl } from "@/lib/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, FadeInStagger } from "./ui/fade-in";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type VehicleFormState = {
  brand: string;
  model: string;
  year: number | null;
  mileage: number | null;
  color: string | null;
  fuel: string | null;
  transmission: string | null;
  plate: string | null;
  renavam: string | null;
  chassis: string | null;
  photos: string[];
  notes: string | null;
  purchase_date: string | null;
  purchase_price: number;
  owner_name: string | null;
  owner_cpf: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  owner_address: string | null;
  profit_margin_pct: number;
  asking_price: number | null;
  status: string;
  sale_date: string | null;
  sale_price: number | null;
  payment_method: string | null;
  payment_installments: number | null;
  intermediary_commission: number;
  commission_type: "percentage" | "fixed";
  commission_rate: number;
  tax_amount: number;
  tax_rate: number;
  buyer_name: string | null;
  buyer_cpf: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  buyer_address: string | null;
  trade_in_vehicle_id: string | null;
  is_trade_in: boolean;
  has_trade_in: boolean;
  trade_in_entry_value: number;
  trade_in_resale_value: number;
  trade_in_status: string;
  trade_in_publish: boolean;
  trade_in_brand?: string;
  trade_in_model?: string;
  trade_in_year?: number | null;
  trade_in_plate?: string;
  trade_in_chassis?: string;
  trade_in_renavam?: string;
  trade_in_mileage?: number | null;
  ad_text: string | null;
  // New fields for down payment and installments
  down_payment_amount: number;
  down_payment_date: string | null;
  down_payment_method: string | null;
  first_installment_date: string | null;
  remove_from_site?: boolean;
};

const empty: VehicleFormState = {
  brand: "",
  model: "",
  year: null,
  mileage: null,
  color: null,
  fuel: null,
  transmission: null,
  plate: null,
  renavam: null,
  chassis: null,
  photos: [],
  notes: null,
  purchase_date: new Date().toISOString().slice(0, 10),
  purchase_price: 0,
  owner_name: null,
  owner_cpf: null,
  owner_phone: null,
  owner_email: null,
  owner_address: null,
  profit_margin_pct: 20,
  asking_price: null,
  status: "available",
  sale_date: null,
  sale_price: null,
  payment_method: null,
  payment_installments: null,
  intermediary_commission: 0,
  commission_type: "percentage",
  commission_rate: 10,
  tax_amount: 0,
  tax_rate: 6,
  buyer_name: null,
  buyer_cpf: null,
  buyer_phone: null,
  buyer_email: null,
  buyer_address: null,
  trade_in_vehicle_id: null,
  is_trade_in: false,
  has_trade_in: false,
  trade_in_entry_value: 0,
  trade_in_resale_value: 0,
  trade_in_status: "maintenance",
  trade_in_publish: false,
  ad_text: null,
  down_payment_amount: 0,
  down_payment_date: new Date().toISOString().slice(0, 10),
  down_payment_method: "pix",
  first_installment_date: null,
  remove_from_site: true,
};

export function VehicleForm({
  initial,
  totalExpenses = 0,
  onSubmit,
  submitting,
  submitLabel,
  showSaleFields = false,
}: {
  initial?: Partial<VehicleFormState>;
  totalExpenses?: number;
  onSubmit: (data: VehicleFormState) => void | Promise<void>;
  submitting?: boolean;
  submitLabel: ReactNode;
  showSaleFields?: boolean;
}) {
  const [f, setF] = useState<VehicleFormState>({ ...empty, ...initial });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initial) setF((s) => ({ ...s, ...initial }));
  }, [initial]);

  const update = <K extends keyof VehicleFormState>(k: K, v: VehicleFormState[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = f.photos.indexOf(active.id as string);
      const newIndex = f.photos.indexOf(over.id as string);
      update("photos", arrayMove(f.photos, oldIndex, newIndex));
    }
  };

  const totalCost = Number(f.purchase_price || 0) + totalExpenses;
  const suggested = totalCost * (1 + Number(f.profit_margin_pct || 0) / 100);

  // Tax calculation: 6% of (Sale Price - Purchase Price)
  const currentSalePrice = f.sale_price || f.asking_price || 0;
  const priceDifference = Math.max(0, currentSalePrice - (f.purchase_price || 0));
  const calculatedTax = priceDifference * (f.tax_rate / 100);

  // Commission calculation logic - now based on profit
  const profitBeforeTaxAndComm = currentSalePrice - totalCost;
  const profitAfterTax = profitBeforeTaxAndComm - calculatedTax;

  const commission =
    f.commission_type === "percentage"
      ? Math.max(0, profitAfterTax) * (f.commission_rate / 100)
      : f.commission_rate;

  const finalProfit = profitAfterTax - commission;

  // Use the calculated values if we are in pricing mode, or the stored ones if they exist
  const displayTax = showSaleFields ? f.tax_amount || calculatedTax : calculatedTax;
  const displayProfit =
    currentSalePrice -
    totalCost -
    displayTax -
    (showSaleFields ? f.intermediary_commission : commission);

  const addWatermark = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const fontSize = Math.floor(img.width * 0.05);
        ctx.font = `bold ${fontSize}px sans-serif`;
        const text = "MRM Automóveis";

        const padding = fontSize * 0.5;
        const textWidth = ctx.measureText(text).width;
        
        // Fundo escuro semi-transparente
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(
          canvas.width - textWidth - padding * 2 - 20,
          canvas.height - fontSize - padding * 2 - 20,
          textWidth + padding * 2,
          fontSize + padding * 2
        );

        // Texto branco sólido
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(text, canvas.width - padding - 20, canvas.height - padding - 20);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.9
        );
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Sessão expirada");
      setUploading(false);
      return;
    }
    const urls: string[] = [];
    for (const file of files) {
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        const watermarkedFile = await addWatermark(compressedFile);

        const ext = watermarkedFile.name.split(".").pop() || "jpg";
        const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("vehicle-photos").upload(path, watermarkedFile);
        if (error) {
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }
        const { data: signed } = await supabase.storage
          .from("vehicle-photos")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) urls.push(signed.signedUrl);
      } catch (err) {
        toast.error(`Erro ao processar imagem ${file.name}`);
      }
    }
    update("photos", [...f.photos, ...urls]);
    setUploading(false);
    e.target.value = "";
  };

  const removePhoto = (i: number) =>
    update(
      "photos",
      f.photos.filter((_, idx) => idx !== i),
    );

  const movePhoto = (from: number, to: number) => {
    if (to < 0 || to >= f.photos.length) return;
    const newPhotos = [...f.photos];
    const [moved] = newPhotos.splice(from, 1);
    newPhotos.splice(to, 0, moved);
    update("photos", newPhotos);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
      <FadeInStagger className="space-y-8">
        {/* Photos */}
        <Section title="Fotos">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={f.photos} strategy={rectSortingStrategy}>
                {f.photos.map((url, i) => (
                  <SortablePhoto key={url} url={url} id={url} onRemove={() => removePhoto(i)} />
                ))}
              </SortableContext>
            </DndContext>
            <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors group">
              <Upload className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
              <span className="text-xs text-muted-foreground mt-2">
                {uploading ? "Enviando..." : "Adicionar"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </Section>

        <Section title="Dados do veículo">
          <Grid>
            <Field label="Marca *">
              <Input required value={f.brand} onChange={(e) => update("brand", e.target.value)} />
            </Field>
            <Field label="Modelo *">
              <Input required value={f.model} onChange={(e) => update("model", e.target.value)} />
            </Field>
            <Field label="Ano">
              <Input
                type="number"
                value={f.year ?? ""}
                onChange={(e) => update("year", e.target.value ? +e.target.value : null)}
              />
            </Field>
            <Field label="Quilometragem">
              <Input
                type="number"
                value={f.mileage ?? ""}
                onChange={(e) => update("mileage", e.target.value ? +e.target.value : null)}
              />
            </Field>
            <Field label="Cor">
              <Input
                value={f.color ?? ""}
                onChange={(e) => update("color", e.target.value || null)}
              />
            </Field>
            <Field label="Combustível">
              <Select value={f.fuel ?? ""} onValueChange={(v) => update("fuel", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {["Flex", "Gasolina", "Etanol", "Diesel", "GNV", "Híbrido", "Elétrico"].map(
                    (o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Câmbio">
              <Select value={f.transmission ?? ""} onValueChange={(v) => update("transmission", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {["Manual", "Automático", "Automatizado", "CVT"].map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Placa">
              <Input
                value={f.plate ?? ""}
                onChange={(e) => update("plate", e.target.value.toUpperCase() || null)}
              />
            </Field>
            <Field label="Renavam">
              <Input
                value={f.renavam ?? ""}
                onChange={(e) => update("renavam", e.target.value || null)}
              />
            </Field>
            <Field label="Chassi">
              <Input
                value={f.chassis ?? ""}
                onChange={(e) => update("chassis", e.target.value || null)}
              />
            </Field>
          </Grid>
        </Section>

        <Section title="Compra">
          <Grid>
            <Field label="Data da compra">
              <Input
                type="date"
                value={f.purchase_date ?? ""}
                onChange={(e) => update("purchase_date", e.target.value || null)}
              />
            </Field>
            <Field label="Valor da compra (R$)">
              <Input
                type="number"
                step="0.01"
                required
                value={f.purchase_price || ""}
                onChange={(e) => update("purchase_price", +e.target.value || 0)}
              />
            </Field>
          </Grid>
        </Section>

        <Section title="Dados do vendedor">
          <Grid>
            <Field label="Nome">
              <Input
                value={f.owner_name ?? ""}
                onChange={(e) => update("owner_name", e.target.value || null)}
              />
            </Field>
            <Field label="CPF">
              <Input
                value={f.owner_cpf ?? ""}
                onChange={(e) => update("owner_cpf", e.target.value || null)}
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={f.owner_phone ?? ""}
                onChange={(e) => update("owner_phone", e.target.value || null)}
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={f.owner_email ?? ""}
                onChange={(e) => update("owner_email", e.target.value || null)}
              />
            </Field>
            <Field label="Endereço" full>
              <Input
                value={f.owner_address ?? ""}
                onChange={(e) => update("owner_address", e.target.value || null)}
              />
            </Field>
          </Grid>
        </Section>

        <Section title="Precificação">
          <div className="grid gap-6 lg:grid-cols-2">
            <FadeInStagger className="space-y-4">
              <Field label="Margem de lucro desejada (%)">
                <Input
                  type="number"
                  step="0.1"
                  value={f.profit_margin_pct}
                  onChange={(e) => update("profit_margin_pct", +e.target.value || 0)}
                />
              </Field>
              <Field
                label={
                  <div className="flex items-center justify-between w-full">
                    <span>Valor real de venda (R$)</span>
                    <FipeModal 
                      onApplyPrice={(data) => {
                        update("asking_price", data.price);
                        if (data.brand) update("brand", data.brand);
                        if (data.model) update("model", data.model);
                        if (data.year) update("year", data.year);
                      }} 
                      initialBrand={f.brand}
                      initialModel={f.model}
                      initialYear={f.year}
                    />
                  </div>
                }
              >
                <Input
                  type="number"
                  step="0.01"
                  value={f.asking_price || ""}
                  onChange={(e) => update("asking_price", e.target.value ? +e.target.value : null)}
                  placeholder="Valor que você quer vender"
                />
              </Field>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Comissão (sobre lucro líquido)</Label>
                  <div className="flex bg-muted rounded-md p-1 gap-1">
                    <Button
                      type="button"
                      variant={f.commission_type === "percentage" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => update("commission_type", "percentage")}
                    >
                      <Percent className="h-3 w-3 mr-1" /> %
                    </Button>
                    <Button
                      type="button"
                      variant={f.commission_type === "fixed" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => update("commission_type", "fixed")}
                    >
                      <DollarSign className="h-3 w-3 mr-1" /> R$
                    </Button>
                  </div>
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={f.commission_rate}
                      onChange={(e) => {
                        const val = +e.target.value || 0;
                        update("commission_rate", val);
                        // Sync with intermediary_commission for consistency
                        const currentSalePrice = f.sale_price || f.asking_price || 0;
                        const priceDiff = Math.max(0, currentSalePrice - (f.purchase_price || 0));
                        const tax = priceDiff * (f.tax_rate / 100);
                        const profitForComm = currentSalePrice - totalCost - tax;
                        const comm =
                          f.commission_type === "percentage"
                            ? Math.max(0, profitForComm) * (val / 100)
                            : val;
                        update("intermediary_commission", comm);
                      }}
                    />
                  </div>
                  <div className="flex-1 bg-muted/50 rounded-md p-2 border border-dashed text-center">
                    <div className="text-[10px] text-muted-foreground uppercase">
                      Valor estimado
                    </div>
                    <div className="text-sm font-semibold">{brl(commission)}</div>
                  </div>
                </div>
              </div>
            </FadeInStagger>
            <FadeIn>
              <div className="bg-gradient-to-br from-primary/5 to-gold/10 rounded-xl p-6 border border-primary/20 h-full flex flex-col justify-center transition-all hover:shadow-lg hover:scale-[1.01]">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Calculator className="h-4 w-4" />
                  Resumo Financeiro Estimado
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Preço Sugerido
                    </div>
                    <div className="font-display text-3xl font-bold text-primary">
                      {brl(suggested)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/10">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Custo Total</div>
                      <div className="font-medium text-sm">{brl(totalCost)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">
                        Lucro Líquido
                      </div>
                      <div
                        className={cn(
                          "font-bold text-sm",
                          finalProfit >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {brl(finalProfit)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-primary/10">
                    <div className="text-[10px] text-muted-foreground uppercase">
                      Imposto Estimado (6%)
                    </div>
                    <div className="font-medium text-sm text-amber-600">{brl(calculatedTax)}</div>
                  </div>

                  <div className="text-[10px] text-muted-foreground leading-tight italic">
                    * Lucro líquido calculado sobre o valor real de venda menos custo, imposto e
                    comissão.
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </Section>

        {showSaleFields && (
          <Section title="Venda">
            <Grid>
              <Field label="Status">
                <Select value={f.status} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="maintenance">Em Manutenção</SelectItem>
                    <SelectItem value="reserved">Reservado</SelectItem>
                    <SelectItem value="sold">Vendido</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Data da venda">
                <Input
                  type="date"
                  value={f.sale_date ?? ""}
                  onChange={(e) => update("sale_date", e.target.value || null)}
                />
              </Field>
              <Field label="Valor da venda (R$)">
                <Input
                  type="number"
                  step="0.01"
                  value={f.sale_price ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? +e.target.value : null;
                    update("sale_price", val);
                    if (val) {
                      const diff = Math.max(0, val - (f.purchase_price || 0));
                      const tax = diff * (f.tax_rate / 100);
                      update("tax_amount", tax);
                      const profitForComm = val - totalCost - tax;
                      const comm =
                        f.commission_type === "percentage"
                          ? Math.max(0, profitForComm) * (f.commission_rate / 100)
                          : f.commission_rate;
                      update("intermediary_commission", comm);
                    }
                  }}
                />
              </Field>
              <Field label="Imposto (6% sobre diferença) (R$)">
                <Input
                  type="number"
                  step="0.01"
                  value={f.tax_amount || ""}
                  onChange={(e) => update("tax_amount", +e.target.value || 0)}
                />
              </Field>
              <Field label="Forma de pagamento">
                <Select
                  value={f.payment_method ?? ""}
                  onValueChange={(v) => update("payment_method", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">À vista</SelectItem>
                    <SelectItem value="financed">Financiado</SelectItem>
                    <SelectItem value="trade">Troca</SelectItem>
                    <SelectItem value="mixed">Misto</SelectItem>
                    <SelectItem value="installments">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Comissão (R$)">
                <Input
                  type="number"
                  step="0.01"
                  value={f.intermediary_commission || ""}
                  onChange={(e) => update("intermediary_commission", +e.target.value || 0)}
                  placeholder="Calculada sobre o lucro"
                />
              </Field>
            </Grid>

            {f.status === "sold" && (
              <div className="mt-8 space-y-6">
                <div className="bg-muted/30 p-4 rounded-lg border border-primary/10">
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Sinal Recebido
                  </h3>
                  <Grid>
                    <Field label="Valor do Sinal (R$)">
                      <Input
                        type="number"
                        step="0.01"
                        value={f.down_payment_amount || ""}
                        onChange={(e) => update("down_payment_amount", +e.target.value || 0)}
                      />
                    </Field>
                    <Field label="Data do Recebimento">
                      <Input
                        type="date"
                        value={f.down_payment_date ?? ""}
                        onChange={(e) => update("down_payment_date", e.target.value || null)}
                      />
                    </Field>
                    <Field label="Forma de Recebimento">
                      <Select
                        value={f.down_payment_method ?? ""}
                        onValueChange={(v) => update("down_payment_method", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "PIX",
                            "Dinheiro",
                            "TED",
                            "DOC",
                            "Cartão de Débito",
                            "Cartão de Crédito",
                            "Transferência Bancária",
                            "Outro",
                          ].map((m) => (
                            <SelectItem key={m} value={m.toLowerCase().replace(/ /g, "_")}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </Grid>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg border border-primary/10">
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">
                    Parcelamento do Saldo
                  </h3>
                  <Grid>
                    <Field label="Quantidade de parcelas">
                      <Input
                        type="number"
                        value={f.payment_installments ?? ""}
                        onChange={(e) =>
                          update("payment_installments", e.target.value ? +e.target.value : null)
                        }
                      />
                    </Field>
                    <Field label="Data do primeiro vencimento">
                      <Input
                        type="date"
                        value={f.first_installment_date ?? ""}
                        onChange={(e) => update("first_installment_date", e.target.value || null)}
                      />
                    </Field>
                  </Grid>
                </div>

                <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Remover veículo do site?</Label>
                    <p className="text-xs text-muted-foreground">
                      O anúncio será desativado automaticamente após salvar.
                    </p>
                  </div>
                  <Switch
                    checked={f.remove_from_site}
                    onCheckedChange={(v) => update("remove_from_site", v)}
                  />
                </div>

                <AnimatePresence>
                  {f.sale_price && (
                    <FadeIn>
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Valor da Venda:</span>
                          <span className="font-medium">{brl(f.sale_price || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">(-) Veículo na Troca:</span>
                          <span className="font-medium text-destructive">
                            {brl(f.trade_in_entry_value || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">(-) Sinal Recebido:</span>
                          <span className="font-medium text-destructive">
                            {brl(f.down_payment_amount || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xl font-bold pt-4 border-t border-primary/20">
                          <span>Saldo Financeiro a Receber:</span>
                          <span className="text-primary">
                            {brl(
                              Math.max(
                                0,
                                (f.sale_price || 0) -
                                  (f.trade_in_entry_value || 0) -
                                  (f.down_payment_amount || 0),
                              ),
                            )}
                          </span>
                        </div>

                        {f.payment_installments && f.payment_installments > 0 && (
                          <div className="pt-2">
                            <div className="text-xs text-muted-foreground uppercase font-semibold mb-2">
                              Previsão de Parcelas:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Array.from({ length: Math.min(f.payment_installments, 6) }).map(
                                (_, i) => {
                                  const amount =
                                    Math.max(
                                      0,
                                      (f.sale_price || 0) -
                                        (f.trade_in_entry_value || 0) -
                                        (f.down_payment_amount || 0),
                                    ) / (f.payment_installments || 1);
                                  const date = f.first_installment_date
                                    ? new Date(f.first_installment_date)
                                    : new Date();
                                  if (f.first_installment_date) date.setMonth(date.getMonth() + i);
                                  return (
                                    <div
                                      key={i}
                                      className="text-xs bg-white/50 p-2 rounded border border-dashed flex justify-between"
                                    >
                                      <span>Parcela {i + 1}</span>
                                      <span className="font-medium">
                                        {brl(amount)} • {date.toLocaleDateString("pt-BR")}
                                      </span>
                                    </div>
                                  );
                                },
                              )}
                              {f.payment_installments > 6 && (
                                <div className="text-[10px] text-muted-foreground text-center col-span-full">
                                  ... e mais {f.payment_installments - 6} parcelas
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 bg-success/10 border border-success/20 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase font-semibold">
                            Lucro Real Estimado
                          </div>
                          <div
                            className={cn(
                              "font-display text-2xl font-bold",
                              displayProfit >= 0 ? "text-success" : "text-destructive",
                            )}
                          >
                            {brl(displayProfit)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">ROI</div>
                          <div className="font-semibold text-lg">
                            {((displayProfit / totalCost) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </FadeIn>
                  )}
                </AnimatePresence>
              </div>
            )}
          </Section>
        )}

        <Section title="Veículo na Troca">
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Negócio envolve veículo na troca?</Label>
                <p className="text-sm text-muted-foreground">
                  Ative para cadastrar os detalhes do veículo que está entrando no negócio.
                </p>
              </div>
              <Switch checked={f.has_trade_in} onCheckedChange={(v) => update("has_trade_in", v)} />
            </div>

            <AnimatePresence>
              {f.has_trade_in && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="p-6 border-gold/20 bg-gold/5 space-y-6">
                    <Grid>
                      <Field label="Marca">
                        <Input
                          value={f.trade_in_brand ?? ""}
                          onChange={(e) => update("trade_in_brand", e.target.value)}
                        />
                      </Field>
                      <Field label="Modelo">
                        <Input
                          value={f.trade_in_model ?? ""}
                          onChange={(e) => update("trade_in_model", e.target.value)}
                        />
                      </Field>
                      <Field label="Ano">
                        <Input
                          type="number"
                          value={f.trade_in_year ?? ""}
                          onChange={(e) =>
                            update("trade_in_year", e.target.value ? +e.target.value : null)
                          }
                        />
                      </Field>
                      <Field label="Placa">
                        <Input
                          value={f.trade_in_plate ?? ""}
                          onChange={(e) => update("trade_in_plate", e.target.value.toUpperCase())}
                        />
                      </Field>
                      <Field label="Valor de entrada (R$)">
                        <Input
                          type="number"
                          step="0.01"
                          value={f.trade_in_entry_value || ""}
                          onChange={(e) => update("trade_in_entry_value", +e.target.value || 0)}
                        />
                      </Field>
                      <Field label="Valor de revenda (R$)">
                        <Input
                          type="number"
                          step="0.01"
                          value={f.trade_in_resale_value || ""}
                          onChange={(e) => update("trade_in_resale_value", +e.target.value || 0)}
                        />
                      </Field>
                      <div className="flex items-center justify-between p-2 rounded-md border bg-white/50 col-span-full sm:col-span-1">
                        <Label className="text-sm">Publicar no site?</Label>
                        <Switch
                          checked={f.trade_in_publish}
                          onCheckedChange={(v) => update("trade_in_publish", v)}
                        />
                      </div>
                      <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 col-span-full">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Valor Bruto da Venda:</span>
                          <span className="font-medium">{brl(f.sale_price || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-muted-foreground">
                            (-) Valor do Veículo na Troca:
                          </span>
                          <span className="font-medium text-destructive">
                            {brl(f.trade_in_entry_value || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold mt-2 pt-2 border-t border-primary/20">
                          <span>Saldo Financeiro a Receber:</span>
                          <span className="text-primary">
                            {brl(Math.max(0, (f.sale_price || 0) - (f.trade_in_entry_value || 0)))}
                          </span>
                        </div>
                      </div>
                    </Grid>

                    <div className="pt-4 border-t border-gold/10">
                      <Label className="text-xs text-muted-foreground uppercase mb-3 block">
                        Selecionar do estoque existente
                      </Label>
                      <TradeInSelector
                        value={f.trade_in_vehicle_id}
                        onChange={(id) => update("trade_in_vehicle_id", id)}
                      />
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Section>

        {showSaleFields && (
          <Section title="Dados do comprador">
            <Grid>
              <Field label="Nome">
                <Input
                  value={f.buyer_name ?? ""}
                  onChange={(e) => update("buyer_name", e.target.value || null)}
                />
              </Field>
              <Field label="CPF">
                <Input
                  value={f.buyer_cpf ?? ""}
                  onChange={(e) => update("buyer_cpf", e.target.value || null)}
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={f.buyer_phone ?? ""}
                  onChange={(e) => update("buyer_phone", e.target.value || null)}
                />
              </Field>
              <Field label="E-mail">
                <Input
                  type="email"
                  value={f.buyer_email ?? ""}
                  onChange={(e) => update("buyer_email", e.target.value || null)}
                />
              </Field>
              <Field label="Endereço" full>
                <Input
                  value={f.buyer_address ?? ""}
                  onChange={(e) => update("buyer_address", e.target.value || null)}
                />
              </Field>
            </Grid>
          </Section>
        )}

        <Section title="Texto do Anúncio">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Conteúdo para venda/divulgação</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const text =
                    `🚗 ESTOQUE MRM AUTOMÓVEIS\n` +
                    `🚘 ${f.brand || ""} ${f.model || ""}\n` +
                    `📅 Ano: ${f.year || ""}\n` +
                    `🛣️ KM: ${f.mileage ? f.mileage.toLocaleString("pt-BR") : "—"}\n` +
                    `🎨 Cor: ${f.color || "—"}\n` +
                    `⛽ ${f.fuel || "—"} | ⚙️ ${f.transmission || "—"}\n\n` +
                    (f.asking_price ? `💰 Por apenas: ${brl(f.asking_price)}\n\n` : "\n") +
                    `✨ Veículo de procedência, revisado e com garantia!\n` +
                    `📱 Mande uma mensagem agora e não perca essa oportunidade.`;
                  update("ad_text", text);
                }}
              >
                Gerar Sugestão
              </Button>
            </div>
            <Textarea
              rows={6}
              value={f.ad_text ?? ""}
              onChange={(e) => update("ad_text", e.target.value || null)}
              placeholder="Descreva o veículo para o anúncio..."
              className="font-sans text-sm"
            />
          </div>
        </Section>

        <Section title="Observações Internas">
          <Textarea
            rows={3}
            value={f.notes ?? ""}
            onChange={(e) => update("notes", e.target.value || null)}
            placeholder="Detalhes adicionais sobre o veículo..."
          />
        </Section>

        <FadeIn className="flex justify-end pt-4">
          <Button
            type="submit"
            size="lg"
            className="bg-gradient-primary shadow-elegant transition-all hover:scale-105 active:scale-95 px-10"
            disabled={submitting}
            onClick={async (e) => {
              e.preventDefault();
              const submissionData: VehicleFormState = {
                ...f,
                trade_in_brand: undefined,
                trade_in_model: undefined,
                trade_in_year: undefined,
                trade_in_plate: undefined,
                trade_in_chassis: undefined,
                trade_in_renavam: undefined,
                trade_in_mileage: undefined,
                remove_from_site: undefined,
                // Ensure these are numbers if they exist, or null/default
                purchase_price: f.purchase_price || 0,
                asking_price: f.asking_price || null,
                sale_price: f.sale_price || null,
                down_payment_amount: f.down_payment_amount || 0,
                trade_in_entry_value: f.trade_in_entry_value || 0,
                trade_in_resale_value: f.trade_in_resale_value || 0,
                payment_installments: f.payment_installments || null,
                intermediary_commission: f.intermediary_commission || 0,
                commission_rate: f.commission_rate || 0,
                tax_amount: f.tax_amount || 0,
                tax_rate: f.tax_rate || 0,
                profit_margin_pct: f.profit_margin_pct || 0,
              };
              await onSubmit(submissionData);
            }}
          >
            {submitting ? "Salvando..." : submitLabel}
          </Button>
        </FadeIn>
      </FadeInStagger>
    </form>
  );
}

function TradeInSelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const qc = useQueryClient();
  const [quick, setQuick] = useState({
    brand: "",
    model: "",
    year: "",
    plate: "",
    price: "",
    mileage: "",
    color: "",
    fuel: "",
    transmission: "",
    renavam: "",
    chassis: "",
  });
  const [adding, setAdding] = useState(false);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-for-trade-in"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model, plate")
        .neq("status", "sold");
      return data || [];
    },
  });

  const handleQuickAdd = async () => {
    if (!quick.brand || !quick.model || !quick.price) {
      toast.error("Preencha Marca, Modelo e Valor");
      return;
    }
    setAdding(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        brand: quick.brand,
        model: quick.model,
        year: quick.year ? +quick.year : null,
        plate: quick.plate.toUpperCase() || null,
        purchase_price: +quick.price,
        mileage: quick.mileage ? +quick.mileage : null,
        color: quick.color || null,
        fuel: quick.fuel || null,
        transmission: quick.transmission || null,
        renavam: quick.renavam || null,
        chassis: quick.chassis || null,
        status: "maintenance",
        user_id: u.user.id,
        is_trade_in: true,
        notes: "Entrada como veículo de troca.",
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setAdding(false);
      return;
    }

    toast.success("Veículo de troca cadastrado!");
    qc.invalidateQueries({ queryKey: ["vehicles-for-trade-in"] });
    onChange(data.id);
    setShowQuickAdd(false);
    setAdding(false);
    setQuick({
      brand: "",
      model: "",
      year: "",
      plate: "",
      price: "",
      mileage: "",
      color: "",
      fuel: "",
      transmission: "",
      renavam: "",
      chassis: "",
    });
  };

  const filtered = (vehicles || []).filter(
    (v) =>
      !search || `${v.brand} ${v.model} ${v.plate}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {!showQuickAdd ? (
          <motion.div
            key="selector"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar veículo cadastrado..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="button" variant="outline" onClick={() => setShowQuickAdd(true)}>
                + Novo
              </Button>
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
              {filtered.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-4">
                  Nenhum veículo disponível.
                </p>
              ) : (
                filtered.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onChange(v.id === value ? null : v.id)}
                    className={cn(
                      "text-left p-2 rounded text-sm transition-all",
                      v.id === value
                        ? "bg-primary text-primary-foreground shadow-md translate-x-1"
                        : "hover:bg-muted",
                    )}
                  >
                    <div className="font-semibold">
                      {v.brand} {v.model}
                    </div>
                    <div className="text-xs opacity-80">{v.plate || "Sem placa"}</div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="quick-add"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="p-4 space-y-3 bg-muted/30 border-primary/20">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Cadastro Rápido de Troca</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickAdd(false)}
                >
                  Cancelar
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Marca *</Label>
                  <Input
                    size={1}
                    className="h-8 text-sm"
                    value={quick.brand}
                    onChange={(e) => setQuick((s) => ({ ...s, brand: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Modelo *</Label>
                  <Input
                    size={1}
                    className="h-8 text-sm"
                    value={quick.model}
                    onChange={(e) => setQuick((s) => ({ ...s, model: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Ano</Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={quick.year}
                    onChange={(e) => setQuick((s) => ({ ...s, year: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Placa</Label>
                  <Input
                    className="h-8 text-sm"
                    value={quick.plate}
                    onChange={(e) =>
                      setQuick((s) => ({ ...s, plate: e.target.value.toUpperCase() }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Quilometragem</Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={quick.mileage}
                    onChange={(e) => setQuick((s) => ({ ...s, mileage: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Cor</Label>
                  <Input
                    className="h-8 text-sm"
                    value={quick.color}
                    onChange={(e) => setQuick((s) => ({ ...s, color: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Combustível</Label>
                  <Input
                    className="h-8 text-sm"
                    value={quick.fuel}
                    onChange={(e) => setQuick((s) => ({ ...s, fuel: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Câmbio</Label>
                  <Input
                    className="h-8 text-sm"
                    value={quick.transmission}
                    onChange={(e) => setQuick((s) => ({ ...s, transmission: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-[10px]">Valor de Avaliação (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8 text-sm"
                    value={quick.price}
                    onChange={(e) => setQuick((s) => ({ ...s, price: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                type="button"
                className="w-full h-8 text-sm bg-gradient-primary shadow-sm hover:opacity-90"
                onClick={handleQuickAdd}
                disabled={adding}
              >
                {adding ? "Cadastrando..." : "Confirmar e Vincular"}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <FadeIn>
      <Card className="p-6 rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md group">
        <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-gradient-primary rounded-full group-hover:h-8 transition-all duration-300" />
          {title}
        </h3>
        {children}
      </Card>
    </FadeIn>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Field({ label, children, full }: { label: ReactNode; children: ReactNode; full?: boolean }) {
  return (
    <div className={cn(full ? "sm:col-span-2 lg:col-span-3" : "", "space-y-2")}>
      <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative group">{children}</div>
    </div>
  );
}

export function SortablePhoto({ url, id, onRemove }: { url: string; id: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="aspect-square relative rounded-lg overflow-hidden border group bg-background"
    >
      <div {...attributes} {...listeners} className="w-full h-full cursor-grab active:cursor-grabbing outline-none">
        <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-lg z-10"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
