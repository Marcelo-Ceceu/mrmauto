import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VehicleForm, type VehicleFormState } from "@/components/VehicleForm";
import { type Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/vehicles/new")({
  head: () => ({ meta: [{ title: "Novo veículo — MRM AUTOMÓVEIS" }] }),
  component: NewVehicle,
});

function NewVehicle() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (form: VehicleFormState) => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Sessão expirada");
      setSaving(false);
      return;
    }

    let tradeInId = form.trade_in_vehicle_id;

    // If a new trade-in is defined and not already selected from stock
    if (form.has_trade_in && !tradeInId) {
      const { data: tradeInData, error: tradeInError } = await supabase
        .from("vehicles")
        .insert({
          brand: form.trade_in_brand || "Veículo na Troca",
          model: form.trade_in_model || "Pendente",
          year: form.trade_in_year,
          plate: form.trade_in_plate,
          purchase_price: form.trade_in_entry_value,
          asking_price: form.trade_in_resale_value,
          status: form.trade_in_publish ? "available" : form.trade_in_status || "maintenance",
          is_trade_in: true,
          user_id: userData.user.id,
          notes: `Entrada como troca para o negócio do veículo ${form.brand} ${form.model}.`,
        })
        .select("id")
        .single();

      if (tradeInError) {
        toast.error("Erro ao criar veículo de troca: " + tradeInError.message);
        setSaving(false);
        return;
      }
      tradeInId = tradeInData.id;
    }

    const vehicleTableColumns = [
      "brand",
      "model",
      "year",
      "mileage",
      "color",
      "fuel",
      "transmission",
      "plate",
      "renavam",
      "chassis",
      "photos",
      "notes",
      "purchase_date",
      "purchase_price",
      "owner_name",
      "owner_cpf",
      "owner_phone",
      "owner_email",
      "owner_address",
      "profit_margin_pct",
      "status",
      "sale_date",
      "sale_price",
      "payment_method",
      "payment_installments",
      "intermediary_commission",
      "buyer_name",
      "buyer_cpf",
      "buyer_phone",
      "buyer_email",
      "buyer_address",
      "asking_price",
      "trade_in_vehicle_id",
      "is_trade_in",
      "ad_text",
      "commission_type",
      "commission_rate",
      "has_trade_in",
      "trade_in_entry_value",
      "trade_in_resale_value",
      "trade_in_status",
      "trade_in_publish",
      "tax_amount",
      "tax_rate",
      "is_published",
      "down_payment_amount",
      "down_payment_date",
      "down_payment_method",
      "first_installment_date",
    ];

    const insertData: Record<string, unknown> = {};
    vehicleTableColumns.forEach((col) => {
      if (col in form) {
        insertData[col] = form[col as keyof VehicleFormState];
      }
    });

    insertData.trade_in_vehicle_id = tradeInId;
    insertData.user_id = userData.user.id;
    insertData.is_published = true;

    const { data, error } = await supabase
      .from("vehicles")
      .insert(insertData as Database["public"]["Tables"]["vehicles"]["Insert"])
      .select("id")
      .single();

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Veículo cadastrado!");
    navigate({ to: "/vehicles/$id", params: { id: data.id } });
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/vehicles">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </Link>
      </div>
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Novo veículo</h1>
        <p className="text-muted-foreground mt-1">
          Preencha os dados da compra. Você poderá adicionar despesas e venda depois.
        </p>
      </div>
      <Card className="p-6 lg:p-8">
        <VehicleForm
          onSubmit={handleSubmit}
          submitting={saving}
          submitLabel={
            <>
              <Save className="h-4 w-4 mr-2" /> Cadastrar veículo
            </>
          }
        />
      </Card>
    </div>
  );
}
