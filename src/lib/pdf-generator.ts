import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { brl } from "./format";

export const generateSaleContract = (vehicle: any) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(220, 38, 38); // Red color for MRM
  doc.text("MRM AUTOMÓVEIS", 105, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("CONTRATO DE COMPRA E VENDA DE VEÍCULO", 105, 30, { align: "center" });

  doc.setFontSize(10);
  doc.text(`Data: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, 40, {
    align: "center",
  });

  // Section: Vendedor (Loja)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("1. IDENTIFICAÇÃO DO VENDEDOR", 14, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Nome Fantasia: MRM Automóveis", 14, 62);
  doc.text("CNPJ: 00.000.000/0001-00 (Exemplo)", 14, 67);

  // Section: Comprador
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("2. IDENTIFICAÇÃO DO COMPRADOR", 14, 80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nome: ${vehicle.buyer_name || "Não informado"}`, 14, 87);
  doc.text(`CPF/CNPJ: ${vehicle.buyer_cpf || "Não informado"}`, 14, 92);
  doc.text(`Endereço: ${vehicle.buyer_address || "Não informado"}`, 14, 97);
  doc.text(`Telefone: ${vehicle.buyer_phone || "Não informado"}`, 14, 102);

  // Section: Veículo
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("3. IDENTIFICAÇÃO DO VEÍCULO", 14, 115);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Marca/Modelo: ${vehicle.brand} ${vehicle.model}`, 14, 122);
  doc.text(`Ano: ${vehicle.year || "N/A"}   Cor: ${vehicle.color || "N/A"}`, 14, 127);
  doc.text(`Placa: ${vehicle.plate || "N/A"}   Renavam: ${vehicle.renavam || "N/A"}`, 14, 132);
  doc.text(`Chassi: ${vehicle.chassis || "N/A"}   Km: ${vehicle.mileage || 0} km`, 14, 137);

  // Section: Valores e Pagamento
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("4. CONDIÇÕES DE PAGAMENTO", 14, 150);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Valor de Venda: ${brl(vehicle.sale_price || 0)}`, 14, 157);
  doc.text(`Forma de Pagamento: ${vehicle.payment_method || "Não informado"}`, 14, 162);
  if (vehicle.payment_installments) {
    doc.text(`Parcelas: ${vehicle.payment_installments}x`, 14, 167);
  }

  // Section: Assinaturas
  doc.setFontSize(10);
  doc.text("Por estarem justos e contratados, assinam o presente contrato.", 14, 190);

  doc.line(20, 220, 90, 220);
  doc.text("MRM AUTOMÓVEIS", 55, 225, { align: "center" });
  doc.text("Vendedor", 55, 230, { align: "center" });

  doc.line(120, 220, 190, 220);
  doc.text(vehicle.buyer_name || "Comprador", 155, 225, { align: "center" });
  doc.text("Comprador", 155, 230, { align: "center" });

  doc.save(`Contrato_${vehicle.brand}_${vehicle.model}.pdf`);
};
