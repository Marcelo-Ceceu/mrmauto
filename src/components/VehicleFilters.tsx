import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";

export interface VehicleFilterValues {
  search: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxYear: string;
  maxMileage: string;
}

interface VehicleFiltersProps {
  onFilterChange: (filters: VehicleFilterValues) => void;
  brands: string[];
}

export function VehicleFilters({ onFilterChange, brands }: VehicleFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<VehicleFilterValues>({
    search: "",
    brand: "all",
    minPrice: "",
    maxPrice: "",
    minYear: "",
    maxYear: "",
    maxMileage: "",
  });

  const handleUpdate = (updates: Partial<VehicleFilterValues>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const reset = {
      search: "",
      brand: "all",
      minPrice: "",
      maxPrice: "",
      minYear: "",
      maxYear: "",
      maxMileage: "",
    };
    setFilters(reset);
    onFilterChange(reset);
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por marca, modelo..."
            className="pl-10 h-12 rounded-xl"
            value={filters.search}
            onChange={(e) => handleUpdate({ search: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="h-12 px-6 rounded-xl gap-2 font-semibold">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros Avançados
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          {(filters.search ||
            filters.brand !== "all" ||
            filters.minPrice ||
            filters.maxPrice ||
            filters.minYear ||
            filters.maxYear ||
            filters.maxMileage) && (
            <Button
              variant="ghost"
              className="h-12 px-4 rounded-xl gap-2 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <Collapsible open={isOpen}>
        <CollapsibleContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Marca
              </Label>
              <Select value={filters.brand} onValueChange={(v) => handleUpdate({ brand: v })}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Todas as marcas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as marcas</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Preço Máximo
                </Label>
                <span className="text-xs font-bold">
                  {filters.maxPrice
                    ? `Até R$ ${Number(filters.maxPrice).toLocaleString("pt-BR")}`
                    : "Qualquer valor"}
                </span>
              </div>
              <Slider
                value={[filters.maxPrice ? Number(filters.maxPrice) : 300000]}
                min={10000}
                max={300000}
                step={5000}
                onValueChange={(val) => handleUpdate({ maxPrice: val[0].toString() })}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ano
                </Label>
                <span className="text-xs font-bold">
                  {filters.minYear || 2000} - {filters.maxYear || new Date().getFullYear() + 1}
                </span>
              </div>
              <Slider
                value={[
                  filters.minYear ? Number(filters.minYear) : 2000,
                  filters.maxYear ? Number(filters.maxYear) : new Date().getFullYear() + 1,
                ]}
                min={2000}
                max={new Date().getFullYear() + 1}
                step={1}
                minStepsBetweenThumbs={1}
                onValueChange={(val) =>
                  handleUpdate({ minYear: val[0].toString(), maxYear: val[1].toString() })
                }
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Km Máximo
                </Label>
                <span className="text-xs font-bold">
                  {filters.maxMileage
                    ? `Até ${Number(filters.maxMileage).toLocaleString("pt-BR")} km`
                    : "Qualquer Km"}
                </span>
              </div>
              <Slider
                value={[filters.maxMileage ? Number(filters.maxMileage) : 200000]}
                min={0}
                max={200000}
                step={5000}
                onValueChange={(val) => handleUpdate({ maxMileage: val[0].toString() })}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
