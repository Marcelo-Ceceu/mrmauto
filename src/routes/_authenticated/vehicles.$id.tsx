import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Save, Trash2, Plus, DollarSign, Printer, FileText, Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VehicleForm, type VehicleFormState } from "@/components/VehicleForm";
import { brl, fmtDate } from "@/lib/format";
import { type Database } from "@/integrations/supabase/types";
import { generateSaleContract } from "@/lib/pdf-generator";

type Installment = Database["public"]["Tables"]["installments"]["Row"];
type Log = Database["public"]["Tables"]["negotiation_logs"]["Row"];
type VehicleDocument = Database["public"]["Tables"]["vehicle_documents"]["Row"];

export const Route = createFileRoute("/_authenticated/vehicles/$id")({
  head: () => ({ meta: [{ title: "Veículo — MRM AUTOMÓVEIS" }] }),
  component: VehicleDetail,
});

const expenseCategories = [
  { value: "ipva", label: "IPVA" },
  { value: "fines", label: "Multas" },
  { value: "transfer", label: "Transferência" },
  { value: "repair", label: "Reparo / Mecânica" },
  { value: "detailing", label: "Estética / Lavagem" },
  { value: "parts", label: "Peças" },
  { value: "other", label: "Outros" },
];

async function fetchVehicle(id: string) {
  const [v, e, n] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).single(),
    supabase
      .from("vehicle_expenses")
      .select("*")
      .eq("vehicle_id", id)
      .order("expense_date", { ascending: false }),
    supabase
      .from("negotiations")
      .select("*, installments(*), negotiation_logs(*)")
      .eq("vehicle_id", id)
      .maybeSingle(),
    supabase
      .from("vehicle_documents")
      .select("*")
      .eq("vehicle_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (v.error) throw v.error;
  if (e.error) throw e.error;
  if (n.error) throw n.error;
  const docs = arguments[0]?.[3]?.data ?? [];

  return {
    vehicle: v.data,
    expenses: e.data ?? [],
    negotiation: n.data,
    installments: (n.data?.installments || []) as Installment[],
    logs: (n.data?.negotiation_logs || []) as Log[],
    documents: docs as VehicleDocument[],
  };
}

function VehicleDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => fetchVehicle(id),
  });

  // expense form
  const [exp, setExp] = useState({
    category: "other",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
  });

  const [uploadingDoc, setUploadingDoc] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalExpenses = data.expenses.reduce((a, e) => a + Number(e.amount), 0);

  const handleUpdate = async (form: VehicleFormState) => {
    setSaving(true);

    let tradeInId = form.trade_in_vehicle_id;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Sessão expirada");
      setSaving(false);
      return;
    }

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

      if (!tradeInError) {
        tradeInId = tradeInData.id;
      }
    }

    // Update vehicle details
    // Only include columns that belong to the vehicles table
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

    const updateData: Record<string, unknown> = {};
    vehicleTableColumns.forEach((col) => {
      if (col in form) {
        updateData[col] = form[col as keyof VehicleFormState];
      }
    });

    updateData.trade_in_vehicle_id = tradeInId;

    // Handle site removal based on the toggle
    if (form.status === "sold") {
      updateData.is_published = !form.remove_from_site;
    } else {
      updateData.is_published = data.vehicle.is_published;
    }

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update(updateData as Database["public"]["Tables"]["vehicles"]["Update"])
      .eq("id", id);

    if (vehicleError) {
      toast.error(vehicleError.message);
      setSaving(false);
      return;
    }

    // Create or update negotiation record if it's sold
    if (form.status === "sold") {
      const salePrice = form.sale_price || 0;
      const tradeInValue = form.trade_in_entry_value || 0;
      const downPayment = form.down_payment_amount || 0;
      const remainingBalance = salePrice - tradeInValue - downPayment;

      const { data: negData, error: negError } = await supabase
        .from("negotiations")
        .upsert(
          {
            vehicle_id: id,
            buyer_name: form.buyer_name,
            buyer_cpf: form.buyer_cpf,
            buyer_phone: form.buyer_phone,
            buyer_email: form.buyer_email,
            sale_date: form.sale_date || new Date().toISOString().slice(0, 10),
            sale_price: salePrice,
            trade_in_vehicle_id: tradeInId,
            trade_in_value: tradeInValue,
            down_payment_amount: downPayment,
            down_payment_date: form.down_payment_date,
            down_payment_method: form.down_payment_method,
            cash_amount:
              form.payment_method === "cash" || form.payment_method === "pix"
                ? remainingBalance
                : 0,
            remaining_balance: remainingBalance,
            payment_method: form.payment_method,
            installment_count: form.payment_installments || 0,
            first_installment_date: form.first_installment_date,
            status: "completed",
          },
          { onConflict: "vehicle_id" },
        )
        .select("id")
        .single();

      if (negError) {
        toast.error("Erro ao salvar negociação: " + negError.message);
      } else {
        // Log events
        const logs = [];
        if (!data.negotiation) {
          logs.push({
            negotiation_id: negData.id,
            event_type: "sale_created",
            description: `Venda iniciada por ${brl(salePrice)}`,
          });
        }
        if (downPayment > 0) {
          logs.push({
            negotiation_id: negData.id,
            event_type: "down_payment",
            description: `Sinal recebido: ${brl(downPayment)} (${form.down_payment_method})`,
          });
        }
        if (tradeInValue > 0) {
          logs.push({
            negotiation_id: negData.id,
            event_type: "trade_in",
            description: `Veículo na troca: ${brl(tradeInValue)}`,
          });
        }
        if (form.remove_from_site) {
          logs.push({
            negotiation_id: negData.id,
            event_type: "site_removal",
            description: `Veículo removido do site`,
          });
        }

        if (logs.length > 0) await supabase.from("negotiation_logs").insert(logs);

        if (form.payment_installments && form.payment_installments > 0 && remainingBalance > 0) {
          const { data: existingInst } = await supabase
            .from("installments")
            .select("id")
            .eq("negotiation_id", negData.id)
            .limit(1);

          if (!existingInst || existingInst.length === 0) {
            const installmentsCount = form.payment_installments;
            const installmentAmount = remainingBalance / installmentsCount;
            const firstDate = form.first_installment_date
              ? new Date(form.first_installment_date)
              : new Date();

            const insts = Array.from({ length: installmentsCount }).map((_, i) => {
              const dueDate = new Date(firstDate);
              dueDate.setMonth(dueDate.getMonth() + i);
              return {
                negotiation_id: negData.id,
                due_date: dueDate.toISOString().slice(0, 10),
                amount: installmentAmount,
                status: "pending",
              };
            });

            const { error: instError } = await supabase.from("installments").insert(insts);
            if (instError) {
              toast.error("Erro ao gerar parcelas: " + instError.message);
            } else {
              await supabase.from("negotiation_logs").insert({
                negotiation_id: negData.id,
                event_type: "installments_generated",
                description: `${installmentsCount} parcelas geradas no valor total de ${brl(remainingBalance)}`,
              });
            }
          }
        }
      }
    }

    setSaving(false);
    toast.success("Veículo e negociação atualizados");
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${id}/${Math.random()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("vehicle_documents").insert({
        vehicle_id: id,
        name: file.name,
        url: publicUrlData.publicUrl,
      });

      if (dbError) throw dbError;

      toast.success("Documento anexado com sucesso");
      qc.invalidateQueries({ queryKey: ["vehicle", id] });
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploadingDoc(false);
      // Reset input
      event.target.value = '';
    }
  };

  const deleteDocument = async (docId: string, url: string) => {
    try {
      const fileName = url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("documents").remove([`${id}/${fileName}`]);
      }
      const { error } = await supabase.from("vehicle_documents").delete().eq("id", docId);
      if (error) throw error;
      
      toast.success("Documento removido");
      qc.invalidateQueries({ queryKey: ["vehicle", id] });
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exp.description || !exp.amount) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("vehicle_expenses").insert({
      vehicle_id: id,
      user_id: u.user.id,
      category: exp.category,
      description: exp.description,
      amount: +exp.amount,
      expense_date: exp.expense_date,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Despesa adicionada");
    setExp({
      category: "other",
      description: "",
      amount: "",
      expense_date: new Date().toISOString().slice(0, 10),
    });
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const deleteExpense = async (expId: string) => {
    const { error } = await supabase.from("vehicle_expenses").delete().eq("id", expId);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const deleteVehicle = async () => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Veículo removido");
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    navigate({ to: "/vehicles" });
  };

  const handleInstallmentPayment = async (instId: string, amount: number) => {
    const paymentDate = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("installments")
      .update({
        status: "paid",
        payment_date: paymentDate,
        received_amount: amount,
      })
      .eq("id", instId);

    if (error) {
      toast.error("Erro ao dar baixa: " + error.message);
      return;
    }

    // Log payment
    if (data.negotiation) {
      await supabase.from("negotiation_logs").insert({
        negotiation_id: data.negotiation.id,
        event_type: "installment_paid",
        description: `Parcela paga: ${brl(amount)} em ${fmtDate(paymentDate)}`,
      });

      // Check if quitada
      const { data: remaining } = await supabase
        .from("installments")
        .select("id")
        .eq("negotiation_id", data.negotiation.id)
        .neq("status", "paid");
      if (!remaining || remaining.length === 0) {
        await supabase.from("negotiation_logs").insert({
          negotiation_id: data.negotiation.id,
          event_type: "sale_quitada",
          description: `Venda quitada com sucesso!`,
        });
      }
    }

    toast.success("Pagamento registrado com sucesso!");
    qc.invalidateQueries({ queryKey: ["vehicle", id] });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  return (
    <>
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6 print:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/vehicles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </Link>
          {data.vehicle.status === "sold" && (
            <>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir Recibo
              </Button>
              <Button variant="default" size="sm" onClick={() => generateSaleContract(data.vehicle)}>
                <FileText className="h-4 w-4 mr-2" /> Gerar Contrato
              </Button>
            </>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação removerá o veículo e todas as despesas associadas. Não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteVehicle}
                className="bg-destructive text-destructive-foreground"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            {data.vehicle.brand} {data.vehicle.model}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              {data.vehicle.year ?? "—"} · {data.vehicle.plate ?? "sem placa"}
            </p>
            {data.vehicle.user_id && (
              <UserBadge userId={data.vehicle.user_id} label="Cadastrado por" />
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <Badge
            className="text-sm px-3 py-1"
            variant={
              data.vehicle.status === "sold"
                ? "default"
                : data.vehicle.status === "maintenance"
                  ? "destructive"
                  : "secondary"
            }
          >
            {data.vehicle.status === "sold"
              ? "Vendido"
              : data.vehicle.status === "reserved"
                ? "Reservado"
                : data.vehicle.status === "maintenance"
                  ? "Em Manutenção"
                  : "Disponível"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Marca" value={data.vehicle.brand} />
        <StatCard label="Modelo" value={data.vehicle.model} />
        <StatCard label="Ano" value={data.vehicle.year?.toString() || "—"} />
        <StatCard
          label="Quilometragem"
          value={data.vehicle.mileage ? `${data.vehicle.mileage.toLocaleString()} km` : "—"}
        />
        <StatCard
          label="Valor de Venda"
          value={data.vehicle.asking_price ? brl(data.vehicle.asking_price) : "—"}
        />
        {data.negotiation && (
          <>
            <StatCard
              label="Sinal Recebido"
              value={brl(data.negotiation.down_payment_amount || 0)}
            />
            <StatCard
              label="Saldo a Receber"
              value={brl(data.negotiation.remaining_balance || 0)}
              className={
                data.negotiation.financial_status === "quitada" ? "text-success" : "text-primary"
              }
            />
            <StatCard
              label="Situação Financeira"
              value={data.negotiation.financial_status === "quitada" ? "Quitada" : "Em Aberto"}
            />
          </>
        )}
      </div>

      {data.negotiation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 border-primary/20 bg-primary/5">
            <h2 className="font-display text-lg font-semibold mb-4 border-l-4 border-primary pl-3">
              Controle de Recebimentos
            </h2>
            <div className="space-y-3">
              {data.installments
                .sort((a, b) => a.due_date.localeCompare(b.due_date))
                .map((inst, idx) => {
                  const isOverdue = new Date(inst.due_date) < new Date() && inst.status !== "paid";
                  return (
                    <div
                      key={inst.id}
                      className="flex flex-wrap items-center justify-between p-3 bg-white/50 rounded-lg border border-dashed gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{brl(inst.amount)}</div>
                          <div
                            className={cn(
                              "text-xs font-medium",
                              isOverdue ? "text-destructive" : "text-muted-foreground",
                            )}
                          >
                            Vencimento: {fmtDate(inst.due_date)} {isOverdue && " (Atrasado)"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            inst.status === "paid"
                              ? "default"
                              : isOverdue
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {inst.status === "paid" ? "Pago" : isOverdue ? "Vencido" : "Aberto"}
                        </Badge>
                        {inst.status !== "paid" && (
                          <Button
                            size="sm"
                            onClick={() => handleInstallmentPayment(inst.id, inst.amount)}
                          >
                            Dar Baixa
                          </Button>
                        )}
                        {inst.status === "paid" && (
                          <div className="text-xs text-muted-foreground">
                            Pago em: {fmtDate(inst.payment_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold mb-4 border-l-4 border-gold pl-3">
              Histórico
            </h2>
            <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
              {data.logs
                .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
                .map((log) => (
                  <div key={log.id} className="relative pl-8">
                    <div className="absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="text-sm font-medium">{log.description}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {fmtDate((log.created_at || "").slice(0, 10))}
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {data.vehicle.ad_text && (
        <Card className="p-6 border-gold/30 bg-gold/5">
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            📢 Texto para Anúncio
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs"
              onClick={() => {
                navigator.clipboard.writeText(data.vehicle.ad_text || "");
                toast.success("Texto copiado!");
              }}
            >
              Copiar
            </Button>
          </h2>
          <div className="bg-white/50 p-4 rounded-md border whitespace-pre-wrap text-sm leading-relaxed">
            {data.vehicle.ad_text}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold border-l-4 border-blue-500 pl-3">
            Documentos e Anexos
          </h2>
          <div>
            <Label htmlFor="doc-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 bg-blue-500/10 text-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors">
                {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Anexar Arquivo
              </div>
            </Label>
            <input 
              id="doc-upload" 
              type="file" 
              className="hidden" 
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              disabled={uploadingDoc}
            />
          </div>
        </div>
        
        {data.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum documento anexado.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-xl bg-muted/20">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-10 w-10 shrink-0 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" title={doc.name}>{doc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(doc.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => deleteDocument(doc.id, doc.url)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold border-l-4 border-gold pl-3">
            Despesas relacionadas
          </h2>
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-bold text-foreground">{brl(totalExpenses)}</span>
          </span>
        </div>
        <form
          onSubmit={addExpense}
          className="grid gap-3 sm:grid-cols-5 mb-4 p-3 bg-muted/40 rounded-lg"
        >
          <div className="sm:col-span-1">
            <Label className="text-xs">Categoria</Label>
            <Select
              value={exp.category}
              onValueChange={(v) => setExp((s) => ({ ...s, category: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Descrição</Label>
            <Input
              value={exp.description}
              onChange={(e) => setExp((s) => ({ ...s, description: e.target.value }))}
              placeholder="Ex: Troca de óleo"
            />
          </div>
          <div>
            <Label className="text-xs">Valor</Label>
            <Input
              type="number"
              step="0.01"
              value={exp.amount}
              onChange={(e) => setExp((s) => ({ ...s, amount: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Data</Label>
            <Input
              type="date"
              value={exp.expense_date}
              onChange={(e) => setExp((s) => ({ ...s, expense_date: e.target.value }))}
            />
          </div>
          <Button type="submit" className="sm:col-span-5 bg-gradient-primary">
            <Plus className="h-4 w-4 mr-1" /> Adicionar despesa
          </Button>
        </form>
        {data.expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma despesa registrada.
          </p>
        ) : (
          <div className="divide-y">
            {data.expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div className="flex-1">
                  <div className="font-medium text-sm">{e.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {expenseCategories.find((c) => c.value === e.category)?.label} ·{" "}
                    {fmtDate(e.expense_date)}
                    {e.user_id && <UserBadge userId={e.user_id} label="Por" />}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{brl(e.amount)}</span>
                  <button
                    onClick={() => deleteExpense(e.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 lg:p-8">
        <VehicleForm
          initial={
            {
              ...data.vehicle,
              ...data.negotiation,
              payment_installments:
                data.negotiation?.installment_count || data.vehicle.payment_installments,
              first_installment_date: data.negotiation?.first_installment_date,
              down_payment_amount: data.negotiation?.down_payment_amount || 0,
              down_payment_date:
                data.negotiation?.down_payment_date || new Date().toISOString().slice(0, 10),
              down_payment_method: data.negotiation?.down_payment_method || "pix",
            } as Partial<VehicleFormState>
          }
          totalExpenses={totalExpenses}
          onSubmit={handleUpdate}
          submitting={saving}
          showSaleFields
          submitLabel={
            <>
              <Save className="h-4 w-4 mr-2" /> Salvar alterações
            </>
          }
        />
      </Card>
    </div>
    
    {/* Print Layout */}
    {data.vehicle.status === "sold" && data.negotiation && (
      <div className="hidden print:block p-8 bg-white text-black font-sans">
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold uppercase">Recibo de Compra e Venda</h1>
          <p className="text-muted-foreground mt-2">MRM Automóveis</p>
        </div>
        
        <div className="space-y-6 text-sm">
          <p>
            Recebemos de <strong>{data.negotiation.buyer_name || "_______________________"}</strong>, inscrito no CPF sob nº <strong>{data.negotiation.buyer_cpf || "_______________________"}</strong>, 
            a quantia de <strong>{brl(data.negotiation.down_payment_amount || data.negotiation.sale_price || 0)}</strong> referente 
            {data.negotiation.down_payment_amount ? " ao sinal/entrada " : " ao pagamento integral "}
            para a aquisição do veículo abaixo descrito:
          </p>
          
          <div className="border p-4 rounded bg-gray-50/50">
            <div className="grid grid-cols-2 gap-4">
              <div><strong>Veículo:</strong> {data.vehicle.brand} {data.vehicle.model}</div>
              <div><strong>Ano:</strong> {data.vehicle.year}</div>
              <div><strong>Cor:</strong> {data.vehicle.color}</div>
              <div><strong>Placa:</strong> {data.vehicle.plate || "Não informada"}</div>
              <div><strong>Renavam:</strong> {data.vehicle.renavam || "Não informado"}</div>
              <div><strong>Chassi:</strong> {data.vehicle.chassis || "Não informado"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6">
            <div className="space-y-2">
              <p><strong>Valor Total da Venda:</strong> {brl(data.negotiation.sale_price || 0)}</p>
              {(data.negotiation.trade_in_value || 0) > 0 && (
                <p><strong>Veículo na Troca:</strong> {brl(data.negotiation.trade_in_value || 0)}</p>
              )}
              {(data.negotiation.down_payment_amount || 0) > 0 && (
                <p><strong>Sinal/Entrada:</strong> {brl(data.negotiation.down_payment_amount || 0)} ({data.negotiation.down_payment_method})</p>
              )}
              {(data.negotiation.remaining_balance || 0) > 0 && (
                <p><strong>Saldo Restante:</strong> {brl(data.negotiation.remaining_balance || 0)}</p>
              )}
            </div>
            
            <div className="border border-dashed p-4 rounded text-center">
              <p className="text-xs text-gray-500 mb-8">Assinatura do Vendedor / Recebedor</p>
              <div className="border-b border-black w-4/5 mx-auto mb-2"></div>
              <p className="font-bold">MRM Automóveis</p>
            </div>
          </div>
          
          <p className="text-center mt-12">
            Data: ____ / ____ / ________
          </p>
        </div>
      </div>
    )}
    </>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
        {label}
      </span>
      <span className={cn("text-lg font-medium", className)}>{value}</span>
    </Card>
  );
}

function UserBadge({ userId, label = "Por" }: { userId: string; label?: string }) {
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
      {label}: {profile.full_name}
    </span>
  );
}
