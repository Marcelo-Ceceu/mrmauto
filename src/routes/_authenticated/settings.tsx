import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageCircle, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const [whatsapp, setWhatsapp] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const waSetting = settings.find((s) => s.key === "whatsapp_number");
      if (waSetting) setWhatsapp(waSetting.value);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (newValue: string) => {
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "whatsapp_number", value: newValue });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configurações salvas", {
        description: "O número do WhatsApp foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast.error("Erro ao salvar", {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    // Remove non-numeric characters for storage if needed, but keeping simple for now
    mutation.mutate(whatsapp);
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-2">Gerencie as informações gerais do seu sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            WhatsApp de Contato
          </CardTitle>
          <CardDescription>
            Este número será usado para o botão "Tenho Interesse" no site público.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">Número do WhatsApp (DDI + DDD + Número)</Label>
            <div className="flex gap-2">
              <Input
                id="whatsapp"
                placeholder="Ex: 5531987984668"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Insira apenas números, começando pelo código do país (55 para Brasil).
            </p>
          </div>
          <Button
            className="w-full sm:w-auto bg-gradient-gold text-gold-foreground"
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
