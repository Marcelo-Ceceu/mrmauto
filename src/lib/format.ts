export const brl = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
};

export const fmtDateTime = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
};
