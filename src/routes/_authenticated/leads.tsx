import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  Phone,
  MessageSquare,
  Car,
  Plus,
  Search,
  Calendar,
  MapPin,
  DollarSign,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Clock,
  X,
  ShieldCheck,
  Check,
  ArrowRight,
  TrendingUp,
  ClipboardList,
  UserCheck,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Clientes — MRM AUTOMÓVEIS" }] }),
  component: ClientsPage,
});

export interface PostSaleRecord {
  id: string;
  date: string;
  complaint: string;
  action_taken: string;
  amount_spent: number;
  status: "in_review" | "in_maintenance" | "resolved";
}

export interface AttendanceRecord {
  id: string;
  content: string;
  created_at: string;
  user_name: string;
  next_action?: string;
  next_action_datetime?: string;
}

export interface ClientData {
  id: string;
  name: string;
  phone: string;
  vehicle_id: string | null;
  status: string;
  created_at: string;
  email: string;
  profession: string;
  monthly_income: number | null;
  target_installment: number | null;
  down_payment: number | null;
  viable_options: string;
  notes: string;
  address: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  post_sale_records: PostSaleRecord[];
  attendance_records: AttendanceRecord[];
  vehicles?: {
    id: string;
    brand: string;
    model: string;
    year: number | null;
    asking_price: number | null;
    photos: string[] | null;
    status: string;
  } | null;
}

// Configuração do fluxo de etapas do cliente
const PIPELINE_STATUSES = [
  { id: "cliente_novo", label: "Cliente Novo", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30" },
  { id: "em_atendimento", label: "Em Atendimento", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" },
  { id: "visita_agendada", label: "Visita Agendada", color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30" },
  { id: "em_aprovacao", label: "Em Processo de Aprovação", color: "text-yellow-400", bg: "bg-yellow-500/15", border: "border-yellow-500/30" },
  { id: "venda_concluida", label: "Venda Concluída", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  { id: "descartado", label: "Descartado", color: "text-zinc-400", bg: "bg-zinc-800", border: "border-zinc-700" },
] as const;

function normalizeStatus(status: string | null): string {
  if (!status) return "cliente_novo";
  const map: Record<string, string> = {
    new: "cliente_novo",
    contacted: "em_atendimento",
    test_drive: "visita_agendada",
    negotiating: "em_aprovacao",
    closed: "venda_concluida",
    lost: "descartado",
  };
  return map[status] || status;
}

function parseLeadToClient(lead: any): ClientData {
  let name = lead.name || "";
  let email = "";
  let profession = "";
  let monthly_income: number | null = null;
  let target_installment: number | null = null;
  let down_payment: number | null = null;
  let viable_options = "";
  let notes = "";
  let address = {
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  };
  let post_sale_records: PostSaleRecord[] = [];
  let attendance_records: AttendanceRecord[] = [];

  // Tenta parsear JSON se estiver codificado
  if (name.startsWith("{") && name.endsWith("}")) {
    try {
      const parsed = JSON.parse(name);
      name = parsed.name || "Cliente sem nome";
      email = parsed.email || "";
      profession = parsed.profession || "";
      monthly_income = parsed.monthly_income ?? null;
      target_installment = parsed.target_installment ?? null;
      down_payment = parsed.down_payment ?? null;
      viable_options = parsed.viable_options || "";
      notes = parsed.notes || "";
      if (parsed.address) address = { ...address, ...parsed.address };
      if (Array.isArray(parsed.post_sale_records)) {
        post_sale_records = parsed.post_sale_records;
      }
      if (Array.isArray(parsed.attendance_records)) {
        attendance_records = parsed.attendance_records;
      }
    } catch {
      // fallback
    }
  } else if (name.includes(" (Venda: ")) {
    // Formato legado do formulário "Quero vender meu carro"
    const parts = name.split(" (Venda: ");
    name = parts[0];
    const details = parts[1]?.replace(/\)$/, "") || "";
    notes = `Origem: Avaliação do site (${details})`;
    const emailMatch = details.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) email = emailMatch[0];
  } else if (name.includes(" (") && name.endsWith(")")) {
    const parts = name.split(" (");
    name = parts[0];
    notes = parts[1]?.replace(/\)$/, "") || "";
  }

  return {
    id: lead.id,
    name,
    phone: lead.phone || "",
    vehicle_id: lead.vehicle_id || null,
    status: normalizeStatus(lead.status),
    created_at: lead.created_at,
    email,
    profession,
    monthly_income,
    target_installment,
    down_payment,
    viable_options,
    notes,
    address,
    post_sale_records,
    attendance_records,
    vehicles: lead.vehicles,
  };
}

function serializeClientName(client: Partial<ClientData>): string {
  const payload = {
    name: client.name || "Cliente",
    email: client.email || "",
    profession: client.profession || "",
    monthly_income: client.monthly_income ?? null,
    target_installment: client.target_installment ?? null,
    down_payment: client.down_payment ?? null,
    viable_options: client.viable_options || "",
    notes: client.notes || "",
    address: client.address || {},
    post_sale_records: client.post_sale_records || [],
    attendance_records: client.attendance_records || [],
  };
  return JSON.stringify(payload);
}

function ClientsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modais
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"dados" | "atendimentos" | "pos_venda">("dados");

  // Form novo atendimento
  const [isAddingAttendance, setIsAddingAttendance] = useState(false);
  const [newAttendanceContent, setNewAttendanceContent] = useState("");
  const [newAttendanceNextAction, setNewAttendanceNextAction] = useState("");
  const [newAttendanceNextDatetime, setNewAttendanceNextDatetime] = useState("");

  // Form novo cliente
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    phone: "",
    email: "",
    profession: "",
    monthly_income: "",
    target_installment: "",
    down_payment: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "Belo Horizonte",
    state: "MG",
    vehicle_id: "",
    viable_options: "",
    notes: "",
  });

  // Form nova reclamação pós-venda
  const [newComplaintForm, setNewComplaintForm] = useState({
    date: new Date().toISOString().split("T")[0],
    complaint: "",
    action_taken: "",
    amount_spent: "",
    status: "in_review" as const,
  });
  const [isAddingComplaint, setIsAddingComplaint] = useState(false);

  // Consulta de leads/clientes
  const { data: rawLeads, isLoading: isLeadsLoading } = useQuery({
    queryKey: ["clients-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          `
          *,
          vehicles ( id, brand, model, year, asking_price, photos, status )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Consulta de estoque para vincular veículos
  const { data: stockVehicles } = useQuery({
    queryKey: ["stock-for-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, year, asking_price, status, photos, is_published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Converte e normaliza lista de clientes
  const clients = useMemo(() => {
    return (rawLeads || []).map(parseLeadToClient);
  }, [rawLeads]);

  // Contadores do funil
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: clients.length,
      cliente_novo: 0,
      em_atendimento: 0,
      visita_agendada: 0,
      em_aprovacao: 0,
      venda_concluida: 0,
      descartado: 0,
    };
    clients.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [clients]);

  // Filtros de busca e status
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.profession.toLowerCase().includes(search) ||
        (c.vehicles && `${c.vehicles.brand} ${c.vehicles.model}`.toLowerCase().includes(search));

      return matchesStatus && matchesSearch;
    });
  }, [clients, statusFilter, searchTerm]);

  // Mutation: Criar novo cliente
  const createClientMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<ClientData> = {
        name: newClientForm.name,
        email: newClientForm.email,
        phone: newClientForm.phone,
        profession: newClientForm.profession,
        monthly_income: newClientForm.monthly_income ? Number(newClientForm.monthly_income) : null,
        target_installment: newClientForm.target_installment
          ? Number(newClientForm.target_installment)
          : null,
        down_payment: newClientForm.down_payment ? Number(newClientForm.down_payment) : null,
        viable_options: newClientForm.viable_options,
        notes: newClientForm.notes,
        address: {
          cep: newClientForm.cep,
          street: newClientForm.street,
          number: newClientForm.number,
          complement: newClientForm.complement,
          neighborhood: newClientForm.neighborhood,
          city: newClientForm.city,
          state: newClientForm.state,
        },
        post_sale_records: [],
      };

      const serializedName = serializeClientName(payload);

      const { error } = await supabase.from("leads").insert({
        name: serializedName,
        phone: newClientForm.phone,
        status: "cliente_novo",
        vehicle_id: newClientForm.vehicle_id || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado com sucesso!");
      setIsNewClientOpen(false);
      setNewClientForm({
        name: "",
        phone: "",
        email: "",
        profession: "",
        monthly_income: "",
        target_installment: "",
        down_payment: "",
        cep: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "Belo Horizonte",
        state: "MG",
        vehicle_id: "",
        viable_options: "",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["clients-leads"] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao cadastrar cliente: ${err.message}`);
    },
  });

  // Mutation: Atualizar status do cliente com regra de negócio (se venda concluída, despublica o carro)
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      clientId,
      newStatus,
      client,
    }: {
      clientId: string;
      newStatus: string;
      client: ClientData;
    }) => {
      // 1. Atualiza o status do lead
      const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", clientId);
      if (error) throw error;

      // 2. Se o status for "venda_concluida" e houver veículo vinculado, despublica o veículo do site
      if (newStatus === "venda_concluida" && client.vehicle_id) {
        const addressText = client.address.street
          ? `${client.address.street}, ${client.address.number || "S/N"} - ${client.address.neighborhood || ""}, ${client.address.city || ""}`
          : "";

        const { error: carError } = await supabase
          .from("vehicles")
          .update({
            status: "sold",
            is_published: false,
            sale_date: new Date().toISOString().split("T")[0],
            buyer_name: client.name,
            buyer_phone: client.phone,
            buyer_address: addressText || null,
          })
          .eq("id", client.vehicle_id);

        if (carError) {
          console.warn("Aviso ao atualizar veículo:", carError);
        }
      }
    },
    onSuccess: (_, vars) => {
      if (vars.newStatus === "venda_concluida") {
        toast.success(
          "Venda concluída! O veículo foi despublicado da vitrine pública e vinculado a este cliente.",
        );
      } else {
        toast.success("Etapa do cliente atualizada com sucesso.");
      }
      queryClient.invalidateQueries({ queryKey: ["clients-leads"] });
      queryClient.invalidateQueries({ queryKey: ["stock-for-clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar status: ${err.message}`);
    },
  });

  // Mutation: Salvar edição completa do cliente
  const updateClientDetailsMutation = useMutation({
    mutationFn: async (updated: ClientData) => {
      const serializedName = serializeClientName(updated);
      const { error } = await supabase
        .from("leads")
        .update({
          name: serializedName,
          phone: updated.phone,
          status: updated.status,
          vehicle_id: updated.vehicle_id || null,
        })
        .eq("id", updated.id);

      if (error) throw error;

      // Se virou venda concluída e tem veículo, atualiza veículo
      if (updated.status === "venda_concluida" && updated.vehicle_id) {
        await supabase
          .from("vehicles")
          .update({
            status: "sold",
            is_published: false,
            sale_date: new Date().toISOString().split("T")[0],
            buyer_name: updated.name,
            buyer_phone: updated.phone,
          })
          .eq("id", updated.vehicle_id);
      }
    },
    onSuccess: () => {
      toast.success("Ficha do cliente atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["clients-leads"] });
      queryClient.invalidateQueries({ queryKey: ["stock-for-clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  // Adicionar atendimento ao histórico
  const handleAddAttendance = async () => {
    if (!selectedClient || !newAttendanceContent.trim()) {
      toast.error("Descreva o atendimento antes de salvar.");
      return;
    }

    // Busca nome do usuário logado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userName = user?.email || "Usuário desconhecido";
    // Tenta buscar o display name do perfil
    if (user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.full_name) userName = profile.full_name;
    }

    const record: AttendanceRecord = {
      id: Math.random().toString(36).substring(2, 9),
      content: newAttendanceContent.trim(),
      created_at: new Date().toISOString(),
      user_name: userName,
      next_action: newAttendanceNextAction.trim() || undefined,
      next_action_datetime: newAttendanceNextDatetime || undefined,
    };

    // Insere no início (mais recente primeiro)
    const updatedRecords = [record, ...(selectedClient.attendance_records || [])];
    const updatedClient: ClientData = {
      ...selectedClient,
      attendance_records: updatedRecords,
    };

    updateClientDetailsMutation.mutate(updatedClient, {
      onSuccess: () => {
        setSelectedClient(updatedClient);
        setIsAddingAttendance(false);
        setNewAttendanceContent("");
        setNewAttendanceNextAction("");
        setNewAttendanceNextDatetime("");
        toast.success("Atendimento registrado com sucesso!");
      },
    });
  };

  // Adicionar ocorrência de pós-venda
  const handleAddComplaint = async () => {
    if (!selectedClient || !newComplaintForm.complaint) {
      toast.error("Informe a descrição da reclamação.");
      return;
    }

    const record: PostSaleRecord = {
      id: Math.random().toString(36).substring(2, 9),
      date: newComplaintForm.date,
      complaint: newComplaintForm.complaint,
      action_taken: newComplaintForm.action_taken,
      amount_spent: Number(newComplaintForm.amount_spent || 0),
      status: newComplaintForm.status,
    };

    const updatedRecords = [...(selectedClient.post_sale_records || []), record];
    const updatedClient: ClientData = {
      ...selectedClient,
      post_sale_records: updatedRecords,
    };

    // Salva despesa em vehicle_expenses se houver valor gasto e veículo vinculado
    if (record.amount_spent > 0 && selectedClient.vehicle_id) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await supabase.from("vehicle_expenses").insert({
          vehicle_id: selectedClient.vehicle_id,
          description: `Pós-Venda (${selectedClient.name}): ${record.complaint}`,
          amount: record.amount_spent,
          expense_date: record.date,
          category: "pos_venda",
          user_id: user?.id || "",
        });
      } catch (e) {
        console.warn("Erro ao lançar despesa de pós-venda:", e);
      }
    }

    updateClientDetailsMutation.mutate(updatedClient, {
      onSuccess: () => {
        setSelectedClient(updatedClient);
        setIsAddingComplaint(false);
        setNewComplaintForm({
          date: new Date().toISOString().split("T")[0],
          complaint: "",
          action_taken: "",
          amount_spent: "",
          status: "in_review",
        });
        toast.success("Ocorrência de pós-venda registrada com sucesso!");
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-[#0b0d11] text-zinc-100 min-h-screen font-sans">
      {/* ── CABEÇALHO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
              Clientes & CRM
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-red-600/15 border border-red-600/30 text-red-500 text-xs font-bold">
              {clients.length} cadastrados
            </span>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
            Gerencie o funil de atendimento, vinculação de veículos, simulações e histórico de pós-venda
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsNewClientOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 rounded-xl shadow-md shadow-red-600/25 transition-all hover:scale-105 gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>+ Novo Cliente</span>
          </Button>
        </div>
      </div>

      {/* ── FUNIL DE ATENDIMENTO (CARDS DE ETAPA) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {PIPELINE_STATUSES.map((step) => {
          const isSelected = statusFilter === step.id;
          const count = statusCounts[step.id] || 0;

          return (
            <button
              key={step.id}
              onClick={() => setStatusFilter(isSelected ? "all" : step.id)}
              className={cn(
                "p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-24",
                isSelected
                  ? "bg-[#181d26] border-red-500 shadow-md scale-[1.02]"
                  : "bg-[#141820] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#161a22]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider line-clamp-1", step.color)}>
                  {step.label}
                </span>
                <span className={cn("w-2 h-2 rounded-full", step.bg)} />
              </div>
              <div className="flex items-end justify-between mt-2">
                <span className="font-display font-black text-2xl text-white">{count}</span>
                {isSelected && (
                  <span className="text-[10px] text-red-400 font-bold">Ativo ✓</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── BARRA DE PESQUISA & FILTROS ── */}
      <div className="bg-[#141820] border border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Buscar por nome, telefone, veículo ou cidade..."
            className="pl-10 h-10 bg-[#0e1117] border-zinc-800 text-white rounded-xl text-xs focus:ring-red-500 placeholder:text-zinc-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          {statusFilter !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="text-xs border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:text-white h-9 rounded-xl"
            >
              Limpar filtro de etapa ({statusFilter})
            </Button>
          )}
          <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">
            Mostrando <strong className="text-white">{filteredClients.length}</strong> clientes
          </span>
        </div>
      </div>

      {/* ── LISTA PRINCIPAL DE CLIENTES ── */}
      <div className="bg-[#141820] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
        {isLeadsLoading ? (
          <div className="p-12 text-center text-zinc-400 text-xs">Carregando base de clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <Users className="h-10 w-10 text-zinc-600 mb-3" />
            <p className="font-bold text-white text-base">Nenhum cliente encontrado</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              Tente mudar os termos da busca ou filtre por outra etapa do funil.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1117] border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Veículo de Interesse / Compra</th>
                  <th className="py-3.5 px-4">Perfil Financeiro</th>
                  <th className="py-3.5 px-4">Etapa do Funil</th>
                  <th className="py-3.5 px-4 text-center">Pós-Venda</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredClients.map((client) => {
                  const currentStatusCfg =
                    PIPELINE_STATUSES.find((s) => s.id === client.status) || PIPELINE_STATUSES[0];
                  const hasPostSale = client.post_sale_records && client.post_sale_records.length > 0;
                  const totalPostSaleSpent = (client.post_sale_records || []).reduce(
                    (a, b) => a + Number(b.amount_spent || 0),
                    0,
                  );

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedClient(client);
                        setActiveModalTab("dados");
                      }}
                    >
                      {/* Cliente e Contato */}
                      <td className="py-4 px-4 min-w-[200px]">
                        <div className="font-display font-bold text-sm text-white group-hover:text-red-400 transition-colors">
                          {client.name}
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-emerald-400" />
                          <span>{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                            {client.email}
                          </div>
                        )}
                        {client.profession && (
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-2.5 w-2.5 text-zinc-500" />
                            <span>{client.profession}</span>
                          </div>
                        )}
                      </td>

                      {/* Veículo Vinculado */}
                      <td className="py-4 px-4 min-w-[220px]">
                        {client.vehicles ? (
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-9 rounded-md bg-zinc-900 border border-zinc-700/60 overflow-hidden shrink-0 flex items-center justify-center">
                              {client.vehicles.photos?.[0] ? (
                                <img
                                  src={client.vehicles.photos[0]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Car className="h-4 w-4 text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-white text-xs block truncate">
                                {client.vehicles.brand} {client.vehicles.model}
                              </span>
                              <span className="text-[11px] text-zinc-400">
                                {client.vehicles.year} • {brl(client.vehicles.asking_price || 0)}
                              </span>
                            </div>
                          </div>
                        ) : client.viable_options ? (
                          <div className="text-zinc-300 text-xs italic">
                            Opções: {client.viable_options}
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic text-xs">Não vinculado</span>
                        )}
                      </td>

                      {/* Perfil Financeiro */}
                      <td className="py-4 px-4 min-w-[180px]">
                        <div className="space-y-0.5 text-[11px]">
                          {client.monthly_income ? (
                            <div className="text-zinc-300">
                              <span className="text-zinc-500">Renda: </span>
                              <strong>{brl(client.monthly_income)}</strong>
                            </div>
                          ) : null}
                          {client.target_installment ? (
                            <div className="text-zinc-300">
                              <span className="text-zinc-500">Parcela pretendida: </span>
                              <strong className="text-amber-400">{brl(client.target_installment)}</strong>
                            </div>
                          ) : null}
                          {client.down_payment ? (
                            <div className="text-zinc-300">
                              <span className="text-zinc-500">Entrada: </span>
                              <strong className="text-emerald-400">{brl(client.down_payment)}</strong>
                            </div>
                          ) : null}
                          {!client.monthly_income &&
                            !client.target_installment &&
                            !client.down_payment && (
                              <span className="text-zinc-500 italic">Sem dados financeiros</span>
                            )}
                        </div>
                      </td>

                      {/* Etapa do Funil com Seletor Rápido */}
                      <td
                        className="py-4 px-4 min-w-[190px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Select
                          value={client.status}
                          onValueChange={(val) => {
                            updateStatusMutation.mutate({
                              clientId: client.id,
                              newStatus: val,
                              client,
                            });
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-8 text-xs font-bold rounded-xl border bg-transparent",
                              currentStatusCfg.border,
                              currentStatusCfg.color,
                            )}
                          >
                            <SelectValue>{currentStatusCfg.label}</SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-[#141820] border-zinc-800 text-white z-50">
                            {PIPELINE_STATUSES.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                <span className={s.color}>{s.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Pós-Venda Resumo */}
                      <td className="py-4 px-4 text-center min-w-[130px]">
                        {hasPostSale ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full bg-red-950/40 border border-red-500/40 text-red-400 text-[10px] font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {client.post_sale_records.length} ocorrência(s)
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                              Gasto: {brl(totalPostSaleSpent)}
                            </span>
                          </div>
                        ) : client.status === "venda_concluida" ? (
                          <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            Sem queixas
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td
                        className="py-4 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${client.name}, tudo bem? Sou da MRM Automóveis...`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 px-2.5 rounded-lg text-xs gap-1.5 shadow-sm"
                              title="Conversar no WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                          </a>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedClient(client);
                              setActiveModalTab("dados");
                            }}
                            className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 h-8 px-2.5 rounded-lg text-xs"
                          >
                            Ver Ficha
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: CADASTRAR NOVO CLIENTE ── */}
      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        <DialogContent className="max-w-2xl bg-[#141820] border-zinc-800 text-white rounded-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-xl text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-red-500" />
              Novo Cliente
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Cadastre as informações completas do cliente, intenção de compra e dados financeiros.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createClientMutation.mutate();
            }}
            className="space-y-4 pt-2 text-xs"
          >
            {/* Bloco 1: Dados Pessoais */}
            <div className="bg-[#0e1117] p-4 rounded-xl border border-zinc-800 space-y-3">
              <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                1. Identificação e Contato
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Nome Completo *</label>
                  <Input
                    required
                    placeholder="Ex: Carlos Eduardo Silveira"
                    value={newClientForm.name}
                    onChange={(e) => setNewClientForm((p) => ({ ...p, name: e.target.value }))}
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">WhatsApp / Telefone *</label>
                  <Input
                    required
                    placeholder="(31) 99999-9999"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm((p) => ({ ...p, phone: e.target.value }))}
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">E-mail</label>
                  <Input
                    type="email"
                    placeholder="carlos@email.com"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm((p) => ({ ...p, email: e.target.value }))}
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Profissão</label>
                  <Input
                    placeholder="Ex: Engenheiro, Comerciante..."
                    value={newClientForm.profession}
                    onChange={(e) => setNewClientForm((p) => ({ ...p, profession: e.target.value }))}
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Perfil Financeiro e Parcela */}
            <div className="bg-[#0e1117] p-4 rounded-xl border border-zinc-800 space-y-3">
              <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                2. Perfil Financeiro e Pretensão
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Renda Mensal (R$)</label>
                  <Input
                    type="number"
                    placeholder="Ex: 8500"
                    value={newClientForm.monthly_income}
                    onChange={(e) =>
                      setNewClientForm((p) => ({ ...p, monthly_income: e.target.value }))
                    }
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Entrada Disponível (R$)</label>
                  <Input
                    type="number"
                    placeholder="Ex: 25000"
                    value={newClientForm.down_payment}
                    onChange={(e) =>
                      setNewClientForm((p) => ({ ...p, down_payment: e.target.value }))
                    }
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Pretensão de Parcela (R$)</label>
                  <Input
                    type="number"
                    placeholder="Ex: 1400"
                    value={newClientForm.target_installment}
                    onChange={(e) =>
                      setNewClientForm((p) => ({ ...p, target_installment: e.target.value }))
                    }
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Vincular Veículo do Estoque */}
              <div className="space-y-1 pt-2">
                <label className="text-zinc-400 font-semibold">Vincular Veículo do Estoque</label>
                <Select
                  value={newClientForm.vehicle_id}
                  onValueChange={(val) => setNewClientForm((p) => ({ ...p, vehicle_id: val }))}
                >
                  <SelectTrigger className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs">
                    <SelectValue placeholder="Selecione um veículo disponível (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141820] border-zinc-800 text-white z-50 max-h-56">
                    <SelectItem value="none">Nenhum veículo vinculado no momento</SelectItem>
                    {stockVehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.brand} {v.model} ({v.year}) — {brl(v.asking_price || 0)} [{v.status}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-semibold">Opções Viáveis / Preferências</label>
                <Input
                  placeholder="Ex: Busca SUV automático até R$ 80.000 ou hatch econômico"
                  value={newClientForm.viable_options}
                  onChange={(e) =>
                    setNewClientForm((p) => ({ ...p, viable_options: e.target.value }))
                  }
                  className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Bloco 3: Endereço */}
            <div className="bg-[#0e1117] p-4 rounded-xl border border-zinc-800 space-y-3">
              <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                3. Endereço do Cliente
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="sm:col-span-1 space-y-1">
                  <label className="text-zinc-400 font-semibold">CEP</label>
                  <Input
                    placeholder="30000-000"
                    value={newClientForm.cep}
                    onChange={(e) => setNewClientForm((p) => ({ ...p, cep: e.target.value }))}
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-zinc-400 font-semibold">Logradouro / Rua</label>
                  <Input
                    placeholder="Av. Raja Gabaglia"
                    value={newClientForm.street}
                    onChange={(e) => setNewClientForm((p) => ({ ...p, street: e.target.value }))}
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>
                <div className="sm:col-span-1 space-y-1">
                  <label className="text-zinc-400 font-semibold">Número</label>
                  <Input
                    placeholder="2000"
                    value={newClientForm.number}
                    onChange={(e) => setNewClientForm((p) => ({ ...p, number: e.target.value }))}
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Bairro</label>
                  <Input
                    placeholder="Estoril"
                    value={newClientForm.neighborhood}
                    onChange={(e) =>
                      setNewClientForm((p) => ({ ...p, neighborhood: e.target.value }))
                    }
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Cidade</label>
                  <Input
                    value={newClientForm.city}
                    onChange={(e) => setNewClientForm((p) => ({ ...p, city: e.target.value }))}
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Estado</label>
                  <Input
                    value={newClientForm.state}
                    onChange={(e) => setNewClientForm((p) => ({ ...p, state: e.target.value }))}
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 font-semibold">Observações Gerais</label>
              <Input
                placeholder="Anotações internas sobre o atendimento..."
                value={newClientForm.notes}
                onChange={(e) => setNewClientForm((p) => ({ ...p, notes: e.target.value }))}
                className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={createClientMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-red-600/25 transition-all text-sm mt-4"
            >
              {createClientMutation.isPending ? "Cadastrando..." : "Cadastrar Cliente no CRM"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: FICHA COMPLETA DO CLIENTE & PÓS-VENDA ── */}
      {selectedClient && (
        <Dialog open={Boolean(selectedClient)} onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-3xl bg-[#141820] border-zinc-800 text-white rounded-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="font-display font-black text-xl text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-red-500" />
                  {selectedClient.name}
                </DialogTitle>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold border",
                    (PIPELINE_STATUSES.find((s) => s.id === selectedClient.status) || PIPELINE_STATUSES[0])
                      .border,
                    (PIPELINE_STATUSES.find((s) => s.id === selectedClient.status) || PIPELINE_STATUSES[0])
                      .color,
                  )}
                >
                  {(PIPELINE_STATUSES.find((s) => s.id === selectedClient.status) || PIPELINE_STATUSES[0])
                    .label}
                </span>
              </div>
              <DialogDescription className="text-zinc-400 text-xs">
                Ficha cadastral, opções viáveis, dados da compra e acompanhamento pós-venda.
              </DialogDescription>
            </DialogHeader>

            {/* Abas do Modal */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mt-2 flex-wrap">
              <button
                onClick={() => setActiveModalTab("dados")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  activeModalTab === "dados"
                    ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60",
                )}
              >
                Dados & Compra
              </button>
              <button
                onClick={() => { setActiveModalTab("atendimentos"); setIsAddingAttendance(false); }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                  activeModalTab === "atendimentos"
                    ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60",
                )}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Atendimentos</span>
                {selectedClient.attendance_records?.length > 0 && (
                  <span className="bg-zinc-600 text-white text-[10px] px-1.5 rounded-full font-bold ml-1">
                    {selectedClient.attendance_records.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveModalTab("pos_venda")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                  activeModalTab === "pos_venda"
                    ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60",
                )}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Pós-Venda & Reclamações</span>
                {selectedClient.post_sale_records?.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full font-bold ml-1">
                    {selectedClient.post_sale_records.length}
                  </span>
                )}
              </button>
            </div>

            {/* ABA 1: DADOS DO CLIENTE E COMPRA */}
            {activeModalTab === "dados" && (
              <div className="space-y-4 pt-3 text-xs">
                {/* Status Selector */}
                <div className="bg-[#0e1117] p-3 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-zinc-400 font-bold block">Etapa no Funil de Vendas</span>
                    <span className="text-[11px] text-zinc-500">
                      Alterar para &quot;Venda Concluída&quot; retira o carro da vitrine pública automaticamente.
                    </span>
                  </div>
                  <Select
                    value={selectedClient.status}
                    onValueChange={(val) => {
                      setSelectedClient((prev) => (prev ? { ...prev, status: val } : null));
                    }}
                  >
                    <SelectTrigger className="w-56 bg-[#141820] border-zinc-700 text-white h-9 rounded-lg text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141820] border-zinc-800 text-white z-50">
                      {PIPELINE_STATUSES.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          <span className={s.color}>{s.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Veículo Vinculado */}
                <div className="bg-[#0e1117] p-4 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Car className="h-4 w-4 text-red-500" />
                      Veículo Vinculado a este Cliente
                    </span>
                    {selectedClient.status === "venda_concluida" && (
                      <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" /> Venda Concluída (Carro Indisponível no Site)
                      </span>
                    )}
                  </div>

                  <Select
                    value={selectedClient.vehicle_id || "none"}
                    onValueChange={(val) => {
                      const vId = val === "none" ? null : val;
                      const matched = stockVehicles?.find((x) => x.id === vId);
                      setSelectedClient((prev) =>
                        prev
                          ? {
                              ...prev,
                              vehicle_id: vId,
                              vehicles: matched || null,
                            }
                          : null,
                      );
                    }}
                  >
                    <SelectTrigger className="bg-[#141820] border-zinc-800 text-white h-10 rounded-lg text-xs">
                      <SelectValue placeholder="Vincular um veículo do estoque" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141820] border-zinc-800 text-white z-50 max-h-56">
                      <SelectItem value="none">Nenhum veículo vinculado</SelectItem>
                      {stockVehicles?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.brand} {v.model} ({v.year}) — {brl(v.asking_price || 0)} [{v.status}]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Opções Viáveis / Modelos que o cliente procura</label>
                    <Input
                      placeholder="Ex: Sedan automático, cor prata ou preta, até 70.000 km..."
                      value={selectedClient.viable_options || ""}
                      onChange={(e) =>
                        setSelectedClient((prev) =>
                          prev ? { ...prev, viable_options: e.target.value } : null,
                        )
                      }
                      className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Perfil Financeiro */}
                <div className="bg-[#0e1117] p-4 rounded-xl border border-zinc-800 space-y-3">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                    Perfil Financeiro & Parcela
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Renda Mensal (R$)</label>
                      <Input
                        type="number"
                        value={selectedClient.monthly_income ?? ""}
                        onChange={(e) =>
                          setSelectedClient((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  monthly_income: e.target.value ? Number(e.target.value) : null,
                                }
                              : null,
                          )
                        }
                        className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Entrada Disponível (R$)</label>
                      <Input
                        type="number"
                        value={selectedClient.down_payment ?? ""}
                        onChange={(e) =>
                          setSelectedClient((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  down_payment: e.target.value ? Number(e.target.value) : null,
                                }
                              : null,
                          )
                        }
                        className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Pretensão de Parcela (R$)</label>
                      <Input
                        type="number"
                        value={selectedClient.target_installment ?? ""}
                        onChange={(e) =>
                          setSelectedClient((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  target_installment: e.target.value ? Number(e.target.value) : null,
                                }
                              : null,
                          )
                        }
                        className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Dados de Endereço */}
                <div className="bg-[#0e1117] p-4 rounded-xl border border-zinc-800 space-y-3">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                    Endereço
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-zinc-400 font-semibold">CEP</label>
                      <Input
                        value={selectedClient.address?.cep || ""}
                        onChange={(e) =>
                          setSelectedClient((prev) =>
                            prev
                              ? { ...prev, address: { ...prev.address, cep: e.target.value } }
                              : null,
                          )
                        }
                        className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-zinc-400 font-semibold">Rua</label>
                      <Input
                        value={selectedClient.address?.street || ""}
                        onChange={(e) =>
                          setSelectedClient((prev) =>
                            prev
                              ? { ...prev, address: { ...prev.address, street: e.target.value } }
                              : null,
                          )
                        }
                        className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-zinc-400 font-semibold">Número</label>
                      <Input
                        value={selectedClient.address?.number || ""}
                        onChange={(e) =>
                          setSelectedClient((prev) =>
                            prev
                              ? { ...prev, address: { ...prev.address, number: e.target.value } }
                              : null,
                          )
                        }
                        className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Bairro</label>
                      <Input
                        value={selectedClient.address?.neighborhood || ""}
                        onChange={(e) =>
                          setSelectedClient((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  address: { ...prev.address, neighborhood: e.target.value },
                                }
                              : null,
                          )
                        }
                        className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Cidade</label>
                      <Input
                        value={selectedClient.address?.city || ""}
                        onChange={(e) =>
                          setSelectedClient((prev) =>
                            prev
                              ? { ...prev, address: { ...prev.address, city: e.target.value } }
                              : null,
                          )
                        }
                        className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Estado</label>
                      <Input
                        value={selectedClient.address?.state || ""}
                        onChange={(e) =>
                          setSelectedClient((prev) =>
                            prev
                              ? { ...prev, address: { ...prev.address, state: e.target.value } }
                              : null,
                          )
                        }
                        className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Anotações Internas</label>
                  <Input
                    value={selectedClient.notes || ""}
                    onChange={(e) =>
                      setSelectedClient((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                    }
                    className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                  />
                </div>

                {/* Botões de Ação da Ficha */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-zinc-800">
                  <Button
                    onClick={() => {
                      if (selectedClient) updateClientDetailsMutation.mutate(selectedClient);
                    }}
                    disabled={updateClientDetailsMutation.isPending}
                    className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 text-white font-bold h-10 rounded-xl"
                  >
                    Salvar Alterações
                  </Button>

                  {selectedClient.status !== "venda_concluida" && (
                    <Button
                      type="button"
                      onClick={() => {
                        if (selectedClient) {
                          const updated = { ...selectedClient, status: "venda_concluida" };
                          updateClientDetailsMutation.mutate(updated);
                          setSelectedClient(updated);
                        }
                      }}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl px-5 gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Concluir Venda Agora
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ABA 2: HISTÓRICO COMPLETO (ATENDIMENTOS + PÓS-VENDA) */}
            {activeModalTab === "atendimentos" && (() => {
              // Mescla atendimentos e pós-venda em uma linha do tempo única
              type TimelineItem =
                | { kind: "attendance"; data: AttendanceRecord; sortKey: string }
                | { kind: "postsale"; data: PostSaleRecord; sortKey: string };

              const timeline: TimelineItem[] = [
                ...(selectedClient.attendance_records || []).map((a) => ({
                  kind: "attendance" as const,
                  data: a,
                  sortKey: a.created_at,
                })),
                ...(selectedClient.post_sale_records || []).map((p) => ({
                  kind: "postsale" as const,
                  data: p,
                  sortKey: p.date,
                })),
              ].sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

              const totalPostSale = (selectedClient.post_sale_records || []).reduce(
                (s, r) => s + Number(r.amount_spent || 0), 0
              );

              return (
                <div className="space-y-4 pt-3 text-xs">
                  {/* Cabeçalho com contadores e botões */}
                  <div className="bg-[#0e1117] p-4 rounded-xl border border-zinc-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                          Histórico Completo do Cliente
                        </span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                            <ClipboardList className="h-3 w-3 text-zinc-400" />
                            {selectedClient.attendance_records?.length || 0} atendimento(s)
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                            <Wrench className="h-3 w-3 text-red-400" />
                            {selectedClient.post_sale_records?.length || 0} pós-venda
                          </span>
                          {totalPostSale > 0 && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span className="text-red-400 text-[10px] font-bold">
                                Gasto pós-venda: {brl(totalPostSale)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          onClick={() => { setIsAddingAttendance(true); setIsAddingComplaint(false); }}
                          className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold h-8 px-3 rounded-lg text-xs gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Atendimento
                        </Button>
                        <Button
                          onClick={() => { setIsAddingComplaint(true); setIsAddingAttendance(false); }}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold h-8 px-3 rounded-lg text-xs gap-1.5"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Pós-Venda
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Formulário de Novo Atendimento */}
                  {isAddingAttendance && (
                    <div className="bg-[#181d26] p-4 rounded-xl border border-zinc-600/40 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs flex items-center gap-1.5">
                          <ClipboardList className="h-4 w-4 text-zinc-300" />
                          Novo Registro de Atendimento
                        </span>
                        <button onClick={() => setIsAddingAttendance(false)} className="text-zinc-400 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-400 font-semibold">Conversa / Resumo do Atendimento *</label>
                        <Textarea
                          placeholder="Cole a conversa do WhatsApp ou escreva um resumo do que aconteceu neste atendimento..."
                          value={newAttendanceContent}
                          onChange={(e) => setNewAttendanceContent(e.target.value)}
                          className="bg-[#141820] border-zinc-800 text-white rounded-lg text-xs min-h-[120px] resize-y"
                          rows={5}
                        />
                      </div>
                      <div className="bg-[#0e1117] p-3 rounded-xl border border-zinc-800 space-y-2">
                        <span className="text-zinc-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
                          Próxima Ação / Compromisso (opcional)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-zinc-400 font-semibold">Descrição do próximo passo</label>
                            <Input
                              placeholder="Ex: Cliente virá amanhã às 17h ver o Palio"
                              value={newAttendanceNextAction}
                              onChange={(e) => setNewAttendanceNextAction(e.target.value)}
                              className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-zinc-400 font-semibold">Data e horário previstos</label>
                            <Input
                              type="datetime-local"
                              value={newAttendanceNextDatetime}
                              onChange={(e) => setNewAttendanceNextDatetime(e.target.value)}
                              className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="ghost" onClick={() => { setIsAddingAttendance(false); setNewAttendanceContent(""); setNewAttendanceNextAction(""); setNewAttendanceNextDatetime(""); }} className="text-zinc-400 hover:text-white text-xs h-8">Cancelar</Button>
                        <Button onClick={handleAddAttendance} disabled={updateClientDetailsMutation.isPending || !newAttendanceContent.trim()} className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-xs h-8 px-4 rounded-lg">
                          {updateClientDetailsMutation.isPending ? "Salvando..." : "Salvar Atendimento"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Formulário de Nova Ocorrência Pós-Venda (inline) */}
                  {isAddingComplaint && (
                    <div className="bg-[#181d26] p-4 rounded-xl border border-red-500/30 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                          Nova Ocorrência de Pós-Venda
                        </span>
                        <button onClick={() => setIsAddingComplaint(false)} className="text-zinc-400 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-zinc-400 font-semibold">Data do Relato</label>
                          <Input type="date" value={newComplaintForm.date} onChange={(e) => setNewComplaintForm((p) => ({ ...p, date: e.target.value }))} className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-zinc-400 font-semibold">Valor Gasto (R$)</label>
                          <Input type="number" placeholder="Ex: 350.00" value={newComplaintForm.amount_spent} onChange={(e) => setNewComplaintForm((p) => ({ ...p, amount_spent: e.target.value }))} className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-zinc-400 font-semibold">Status do Reparo</label>
                          <Select value={newComplaintForm.status} onValueChange={(val: any) => setNewComplaintForm((p) => ({ ...p, status: val }))}>
                            <SelectTrigger className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#141820] border-zinc-800 text-white z-50">
                              <SelectItem value="in_review">Em Análise</SelectItem>
                              <SelectItem value="in_maintenance">Em Manutenção</SelectItem>
                              <SelectItem value="resolved">Resolvido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-400 font-semibold">Reclamação do Cliente</label>
                        <Input placeholder="Ex: Ar-condicionado não está refrigerando" value={newComplaintForm.complaint} onChange={(e) => setNewComplaintForm((p) => ({ ...p, complaint: e.target.value }))} className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-400 font-semibold">O que foi feito / Solução</label>
                        <Input placeholder="Ex: Carga de gás e troca do filtro" value={newComplaintForm.action_taken} onChange={(e) => setNewComplaintForm((p) => ({ ...p, action_taken: e.target.value }))} className="bg-[#141820] border-zinc-800 text-white h-9 rounded-lg text-xs" />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="ghost" onClick={() => setIsAddingComplaint(false)} className="text-zinc-400 hover:text-white text-xs h-8">Cancelar</Button>
                        <Button onClick={handleAddComplaint} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8 px-4 rounded-lg">Salvar Ocorrência</Button>
                      </div>
                    </div>
                  )}

                  {/* Linha do tempo unificada */}
                  <div className="space-y-2.5">
                    {timeline.length === 0 ? (
                      <div className="p-8 text-center bg-[#0e1117] rounded-xl border border-zinc-800/80">
                        <ClipboardList className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                        <p className="font-semibold text-zinc-300">Nenhum registro ainda</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Use os botões acima para registrar atendimentos ou ocorrências de pós-venda.
                        </p>
                      </div>
                    ) : (
                      timeline.map((item, idx) => {
                        if (item.kind === "attendance") {
                          const att = item.data;
                          return (
                            <div key={`att-${att.id}`} className="p-4 rounded-xl bg-[#0e1117] border border-zinc-800 space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-zinc-700/60 border border-zinc-600/60 flex items-center justify-center text-zinc-300 text-[10px] font-black shrink-0">
                                    <ClipboardList className="h-3 w-3" />
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <UserCheck className="h-3 w-3 text-zinc-400" />
                                      <span className="text-zinc-300 font-bold text-xs">{att.user_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <Clock className="h-3 w-3 text-zinc-500" />
                                      <span className="text-zinc-500 text-[11px]">
                                        {(() => { try { return format(new Date(att.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return att.created_at; } })()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {idx === 0 && <span className="text-[10px] bg-zinc-700/50 border border-zinc-600/50 text-zinc-300 px-2 py-0.5 rounded-full font-bold shrink-0">Mais recente</span>}
                                  <span className="text-[10px] bg-zinc-700/40 border border-zinc-600/40 text-zinc-400 px-2 py-0.5 rounded-full font-bold shrink-0">Atendimento</span>
                                </div>
                              </div>
                              <div className="bg-[#141820] rounded-lg p-3 border border-zinc-800/60">
                                <p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap">{att.content}</p>
                              </div>
                              {(att.next_action || att.next_action_datetime) && (
                                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5">
                                  <CalendarClock className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider block">Próxima Ação</span>
                                    {att.next_action && <p className="text-zinc-200 text-xs mt-0.5">{att.next_action}</p>}
                                    {att.next_action_datetime && (
                                      <p className="text-amber-300/80 text-[11px] mt-0.5 flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {(() => { try { return format(new Date(att.next_action_datetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return att.next_action_datetime; } })()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          const rec = item.data;
                          return (
                            <div key={`ps-${rec.id}`} className="p-4 rounded-xl bg-[#0e1117] border border-red-900/30 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 text-[10px] font-black shrink-0">
                                    <Wrench className="h-3 w-3" />
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3 w-3 text-zinc-500" />
                                      <span className="text-zinc-500 text-[11px]">{rec.date}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {idx === 0 && <span className="text-[10px] bg-zinc-700/50 border border-zinc-600/50 text-zinc-300 px-2 py-0.5 rounded-full font-bold shrink-0">Mais recente</span>}
                                  <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                    rec.status === "resolved" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                                    rec.status === "in_maintenance" && "bg-amber-500/15 text-amber-400 border-amber-500/30",
                                    rec.status === "in_review" && "bg-blue-500/15 text-blue-400 border-blue-500/30",
                                  )}>
                                    {rec.status === "resolved" ? "Resolvido" : rec.status === "in_maintenance" ? "Em Manutenção" : "Em Análise"}
                                  </span>
                                  <span className="text-[10px] bg-red-900/30 border border-red-700/40 text-red-400 px-2 py-0.5 rounded-full font-bold shrink-0">Pós-Venda</span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <div>
                                  <span className="text-zinc-500 text-[10px] uppercase font-bold">Reclamação:</span>
                                  <p className="text-zinc-200 text-xs font-semibold mt-0.5">{rec.complaint}</p>
                                </div>
                                {rec.action_taken && (
                                  <div>
                                    <span className="text-zinc-500 text-[10px] uppercase font-bold">O que foi feito:</span>
                                    <p className="text-emerald-400/90 text-xs mt-0.5">{rec.action_taken}</p>
                                  </div>
                                )}
                                {Number(rec.amount_spent) > 0 && (
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <DollarSign className="h-3 w-3 text-red-400" />
                                    <span className="text-xs text-zinc-400">Gasto: <strong className="text-red-400">{brl(Number(rec.amount_spent))}</strong></span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ABA 3: PÓS-VENDA — resumo financeiro (acesso alternativo) */}
            {activeModalTab === "pos_venda" && (
              <div className="space-y-4 pt-3 text-xs">
                <div className="bg-[#0e1117] p-5 rounded-xl border border-zinc-800 text-center">
                  <ShieldCheck className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
                  <p className="font-semibold text-zinc-200 text-sm">Histórico unificado disponível na aba <span className="text-red-400">Histórico</span></p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto">
                    Todos os atendimentos e ocorrências de pós-venda agora aparecem juntos, em ordem cronológica, na aba Histórico.
                  </p>
                  <Button
                    onClick={() => { setActiveModalTab("atendimentos"); setIsAddingComplaint(true); }}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold h-9 px-4 rounded-lg text-xs gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Registrar Ocorrência de Pós-Venda
                  </Button>
                </div>
                {/* Totalizador financeiro */}
                <div className="bg-[#0e1117] p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Gasto em Pós-Venda</span>
                  <span className="text-xl font-black text-red-500 font-display">
                    {brl((selectedClient.post_sale_records || []).reduce((a, b) => a + Number(b.amount_spent || 0), 0))}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
