import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageCircle, Save, Loader2, MapPin } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");

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

      const addrSetting = settings.find((s) => s.key === "store_address");
      if (addrSetting) setAddress(addrSetting.value);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async ({
      newWhatsapp,
      newAddress,
    }: {
      newWhatsapp: string;
      newAddress: string;
    }) => {
      const updates = [
        supabase.from("settings").upsert({ key: "whatsapp_number", value: newWhatsapp }),
        supabase.from("settings").upsert({ key: "store_address", value: newAddress }),
      ];
      const results = await Promise.all(updates);
      for (const res of results) {
        if (res.error) throw res.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-setting"] });
      toast.success("Configurações salvas", {
        description: "Os dados de contato e endereço foram atualizados com sucesso.",
      });
    },
    onError: (error) => {
      toast.error("Erro ao salvar", {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    mutation.mutate({ newWhatsapp: whatsapp, newAddress: address });
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

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label htmlFor="address" className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              Endereço da Loja
            </Label>
            <Input
              id="address"
              placeholder="Ex: Av. Raja Gabaglia, 2000 - Estoril, Belo Horizonte - MG"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Este endereço será exibido na seção de contato e no rodapé do site.
            </p>
          </div>

          <Button
            className="w-full sm:w-auto bg-gradient-gold text-gold-foreground mt-2"
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
