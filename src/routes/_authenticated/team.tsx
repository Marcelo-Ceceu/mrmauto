import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Loader2, Mail, Lock, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
});

function TeamPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    is_admin: false,
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "create", ...userData },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setNewUser({ email: "", password: "", full_name: "", is_admin: false });
      toast.success("Usuário criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar usuário", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "delete", userId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Usuário removido");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover usuário", { description: error.message });
    },
  });

  if (!isAdmin) {
    return (
      <div className="container py-20 text-center">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2">
          Apenas administradores podem gerenciar a equipe.
        </p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie os membros da sua equipe e permissões de acesso.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit sticky top-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Novo Acesso
            </CardTitle>
            <CardDescription>Crie uma nova conta para um membro da equipe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Ex: João Silva"
                  className="pl-9"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser((s) => ({ ...s, full_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@exemplo.com"
                  className="pl-9"
                  value={newUser.email}
                  onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={newUser.password}
                  onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm">Administrador</Label>
                <p className="text-[10px] text-muted-foreground">Pode gerenciar outros usuários.</p>
              </div>
              <Switch
                checked={newUser.is_admin}
                onCheckedChange={(v) => setNewUser((s) => ({ ...s, is_admin: v }))}
              />
            </div>
            <Button
              className="w-full bg-gradient-gold text-gold-foreground"
              onClick={() => createMutation.mutate(newUser)}
              disabled={createMutation.isPending || !newUser.email || !newUser.password}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Criar Usuário
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Membros Ativos
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {profiles?.length || 0}
            </span>
          </h3>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4">
              {profiles?.map((profile) => (
                <Card
                  key={profile.id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {profile.full_name?.charAt(0) || profile.email?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {profile.full_name || "Sem nome"}
                          {profile.is_admin && (
                            <span className="text-[10px] bg-gold/20 text-gold-foreground px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-gold/30">
                              <Shield className="h-2.5 w-2.5" /> ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{profile.email}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => {
                        if (confirm("Deseja realmente remover este acesso?")) {
                          deleteMutation.mutate(profile.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
