import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Phone, Clock, Car, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  const queryClient = useQueryClient();
  const [isManualLeadOpen, setIsManualLeadOpen] = useState(false);
  const [manualLead, setManualLead] = useState({ name: "", phone: "", notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          vehicles ( brand, model, year )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const handleManualLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLead.name || !manualLead.phone) return;
    
    setIsSubmitting(true);
    try {
      const name = manualLead.notes ? `${manualLead.name} (${manualLead.notes})` : manualLead.name;
      await supabase.from("leads").insert({
        name,
        phone: manualLead.phone,
        status: "new"
      });
      setIsManualLeadOpen(false);
      setManualLead({ name: "", phone: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) {
      console.error(err);
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "new": return <Badge variant="default" className="bg-blue-500">Novo</Badge>;
      case "contacted": return <Badge variant="secondary">Contatado</Badge>;
      case "negotiating": return <Badge variant="default" className="bg-amber-500">Em Negociação</Badge>;
      case "test_drive": return <Badge variant="default" className="bg-purple-500">Test Drive</Badge>;
      case "closed": return <Badge variant="default" className="bg-emerald-500">Vendido</Badge>;
      case "lost": return <Badge variant="destructive">Perdido</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Leads e Contatos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os potenciais clientes que entraram em contato através do site.
          </p>
        </div>
        <Dialog open={isManualLeadOpen} onOpenChange={setIsManualLeadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" /> Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Lead Manual</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleManualLeadSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome do Cliente</Label>
                <Input
                  required
                  placeholder="Ex: João da Silva"
                  value={manualLead.name}
                  onChange={(e) => setManualLead(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp / Telefone</Label>
                <Input
                  required
                  placeholder="(31) 99999-9999"
                  value={manualLead.phone}
                  onChange={(e) => setManualLead(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Veículo de Interesse / Observação</Label>
                <Input
                  placeholder="Ex: Honda Civic 2020"
                  value={manualLead.notes}
                  onChange={(e) => setManualLead(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-primary">
                {isSubmitting ? "Salvando..." : "Salvar Lead"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="py-4">
            <CardTitle className="text-blue-500 text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Novos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {leads?.filter(l => l.status === "new").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardHeader className="py-4">
            <CardTitle className="text-amber-500 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> Em Negociação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">
              {leads?.filter(l => l.status === "negotiating").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardHeader className="py-4">
            <CardTitle className="text-emerald-500 text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" /> Contatados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">
              {leads?.filter(l => l.status === "contacted").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardHeader className="py-4">
            <CardTitle className="text-purple-500 text-sm flex items-center gap-2">
              <Car className="h-4 w-4" /> Test Drive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">
              {leads?.filter(l => l.status === "test_drive").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Leads</CardTitle>
          <CardDescription>Histórico completo de contatos recebidos.</CardDescription>
        </CardHeader>
        <CardContent>
          {leads && leads.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veículo de Interesse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.vehicles ? (
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.vehicles.brand} {lead.vehicles.model} ({lead.vehicles.year})</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Geral / Não especificado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={lead.status || "new"}
                        onValueChange={(val) => updateStatusMutation.mutate({ id: lead.id, status: val })}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue>{getStatusBadge(lead.status)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Novo</SelectItem>
                          <SelectItem value="contacted">Contatado</SelectItem>
                          <SelectItem value="negotiating">Em Negociação</SelectItem>
                          <SelectItem value="test_drive">Test Drive Agendado</SelectItem>
                          <SelectItem value="closed">Vendido</SelectItem>
                          <SelectItem value="lost">Perdido</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <a 
                        href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${lead.name}, sou da MRM Automóveis. Vi que você teve interesse no ${lead.vehicles?.model || 'nosso estoque'}...`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline" className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50">
                          <MessageSquare className="h-4 w-4 mr-2" /> Falar
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto opacity-20 mb-4" />
              <p>Nenhum lead recebido ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
