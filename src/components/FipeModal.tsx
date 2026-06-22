import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

export function FipeModal({ 
  onApplyPrice,
  initialBrand,
  initialModel,
  initialYear
}: { 
  onApplyPrice: (data: { price: number; brand: string; model: string; year: number }) => void;
  initialBrand?: string | null;
  initialModel?: string | null;
  initialYear?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [anos, setAnos] = useState<any[]>([]);
  
  const [selMarca, setSelMarca] = useState("");
  const [selModelo, setSelModelo] = useState("");
  const [selAno, setSelAno] = useState("");
  const [fipeData, setFipeData] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && marcas.length === 0) {
      setLoading(true);
      fetch("https://parallelum.com.br/fipe/api/v1/carros/marcas")
        .then((res) => res.json())
        .then((data) => {
          setMarcas(data);
          if (initialBrand) {
            const m = data.find((x: any) => x.nome.toLowerCase().includes(initialBrand.toLowerCase()));
            if (m) setSelMarca(m.codigo.toString());
          }
        })
        .catch(() => toast.error("Erro ao carregar marcas FIPE"))
        .finally(() => setLoading(false));
    }
  }, [open, initialBrand]);

  useEffect(() => {
    if (selMarca) {
      setLoading(true);
      fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selMarca}/modelos`)
        .then((res) => res.json())
        .then((data) => {
          const mList = data.modelos || [];
          setModelos(mList);
          
          let found = false;
          if (initialModel) {
            const m = mList.find((x: any) => x.nome.toLowerCase().includes(initialModel.toLowerCase()));
            if (m) {
              setSelModelo(m.codigo.toString());
              found = true;
            }
          }
          if (!found) {
            setSelModelo("");
            setSelAno("");
            setFipeData(null);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [selMarca, initialModel]);

  useEffect(() => {
    if (selMarca && selModelo) {
      setLoading(true);
      fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selMarca}/modelos/${selModelo}/anos`)
        .then((res) => res.json())
        .then((data) => {
          setAnos(data);
          
          let found = false;
          if (initialYear) {
            const a = data.find((x: any) => x.nome.includes(initialYear.toString()));
            if (a) {
              setSelAno(a.codigo.toString());
              found = true;
            }
          }
          if (!found) {
            setSelAno("");
            setFipeData(null);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [selModelo, initialYear]);

  useEffect(() => {
    if (selMarca && selModelo && selAno) {
      setLoading(true);
      fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selMarca}/modelos/${selModelo}/anos/${selAno}`)
        .then((res) => res.json())
        .then((data) => {
          setFipeData(data);
        })
        .finally(() => setLoading(false));
    }
  }, [selAno]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" /> Consultar FIPE
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Consulta Tabela FIPE</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-4">
          <div className="space-y-2">
            <Label>Marca</Label>
            <Select value={selMarca} onValueChange={setSelMarca} disabled={loading || marcas.length === 0}>
              <SelectTrigger><SelectValue placeholder="Selecione a Marca" /></SelectTrigger>
              <SelectContent>
                {marcas.map(m => <SelectItem key={m.codigo} value={m.codigo.toString()}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select value={selModelo} onValueChange={setSelModelo} disabled={loading || !selMarca || modelos.length === 0}>
              <SelectTrigger><SelectValue placeholder="Selecione o Modelo" /></SelectTrigger>
              <SelectContent>
                {modelos.map(m => <SelectItem key={m.codigo} value={m.codigo.toString()}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ano</Label>
            <Select value={selAno} onValueChange={setSelAno} disabled={loading || !selModelo || anos.length === 0}>
              <SelectTrigger><SelectValue placeholder="Selecione o Ano" /></SelectTrigger>
              <SelectContent>
                {anos.map(a => <SelectItem key={a.codigo} value={a.codigo.toString()}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {fipeData && (
            <div className="bg-muted p-4 rounded-lg border mt-2 flex flex-col items-center text-center">
              <span className="text-sm text-muted-foreground mb-1">{fipeData.MesReferencia} • FIPE {fipeData.CodigoFipe}</span>
              <span className="text-3xl font-bold text-primary">{fipeData.Valor}</span>
              <Button 
                className="mt-4 w-full bg-gradient-primary" 
                onClick={() => {
                  const numValue = parseFloat(fipeData.Valor.replace("R$ ", "").replace(/\./g, "").replace(",", "."));
                  if (!isNaN(numValue)) {
                    const b = marcas.find(m => m.codigo.toString() === selMarca)?.nome || "";
                    const m = modelos.find(x => x.codigo.toString() === selModelo)?.nome || "";
                    const a = anos.find(x => x.codigo.toString() === selAno)?.nome || "";
                    const y = parseInt(a.split(" ")[0]);
                    
                    onApplyPrice({
                      price: numValue,
                      brand: b,
                      model: m,
                      year: isNaN(y) ? 0 : y
                    });
                  }
                  setOpen(false);
                }}
              >
                Usar Dados da FIPE no Formulário
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
