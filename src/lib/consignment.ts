/**
 * Utility functions for Vehicle Consignment (Veículos Consignados vs. Próprios da Loja)
 * Allows calculating entry value, suggested selling price, and profit estimation.
 */

export type OwnershipType = "store" | "consignment";

/**
 * Checks if a vehicle is consigned based on notes tag or property
 */
export function isVehicleConsigned(vehicle?: {
  notes?: string | null;
  ownership_type?: string | null;
  is_consignment?: boolean | null;
} | null): boolean {
  if (!vehicle) return false;
  if (vehicle.is_consignment === true || vehicle.ownership_type === "consignment") {
    return true;
  }
  if (vehicle.notes) {
    return /\[(CONSIGNADO|TIPO:CONSIGNADO)\]/i.test(vehicle.notes);
  }
  return false;
}

/**
 * Strips [CONSIGNADO] tags from notes for clean user editing
 */
export function cleanConsignmentNotes(notes?: string | null): string {
  if (!notes) return "";
  return notes.replace(/\[(CONSIGNADO|TIPO:CONSIGNADO)\]\s*/gi, "").trim();
}

/**
 * Injects or removes the [CONSIGNADO] tag into notes string
 */
export function injectConsignmentToNotes(
  notes: string | null | undefined,
  isConsigned: boolean,
): string | null {
  const clean = cleanConsignmentNotes(notes);
  if (!isConsigned) {
    return clean || null;
  }
  const tag = "[CONSIGNADO]";
  if (!clean) return tag;
  return `${clean}\n\n${tag}`;
}

export type FinancialBreakdown = {
  ownershipType: OwnershipType;
  entryValue: number; // Purchase cost for store, or agreed owner payout for consignment
  expenses: number;
  totalCost: number; // entryValue + expenses
  suggestedPrice: number;
  currentPrice: number;
  grossProfit: number;
  calculatedTax: number;
  commission: number;
  finalProfit: number;
  profitMarginActualPct: number;
  ownerPayout: number;
};

/**
 * Calculates profit estimation and suggested sales price for store-owned vs. consigned vehicles.
 */
export function calculateFinancials({
  ownershipType,
  purchasePrice,
  totalExpenses,
  profitMarginPct,
  askingPrice,
  salePrice,
  taxRate = 6,
  commissionType = "percentage",
  commissionRate = 10,
}: {
  ownershipType: OwnershipType;
  purchasePrice: number;
  totalExpenses: number;
  profitMarginPct: number;
  askingPrice: number | null;
  salePrice: number | null;
  taxRate?: number;
  commissionType?: "percentage" | "fixed";
  commissionRate?: number;
}): FinancialBreakdown {
  const entryValue = Number(purchasePrice || 0);
  const expenses = Number(totalExpenses || 0);
  const totalCost = entryValue + expenses;

  // Sugestão de venda baseada no custo total e margem de lucro desejada
  const marginPct = Number(profitMarginPct || 0);
  const suggestedPrice = totalCost > 0 ? totalCost * (1 + marginPct / 100) : 0;

  const currentPrice = Number(salePrice || askingPrice || 0);
  const grossProfit = currentPrice - totalCost;

  // Imposto estimado (6% sobre a margem bruta de ganho)
  const priceDifference = Math.max(0, currentPrice - entryValue);
  const calculatedTax = priceDifference * (Number(taxRate || 0) / 100);

  const profitAfterTax = grossProfit - calculatedTax;

  const commission =
    commissionType === "percentage"
      ? Math.max(0, profitAfterTax) * (Number(commissionRate || 0) / 100)
      : Number(commissionRate || 0);

  const finalProfit = profitAfterTax - commission;
  const profitMarginActualPct =
    totalCost > 0 ? (finalProfit / totalCost) * 100 : 0;

  return {
    ownershipType,
    entryValue,
    expenses,
    totalCost,
    suggestedPrice,
    currentPrice,
    grossProfit,
    calculatedTax,
    commission,
    finalProfit,
    profitMarginActualPct,
    ownerPayout: entryValue,
  };
}
