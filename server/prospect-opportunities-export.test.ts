import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  generateProspectOpportunitiesExcel,
  generateProspectOpportunitiesPdf,
  type ProspectExportPayload,
} from "./prospect-opportunities-export";

const payload: ProspectExportPayload = {
  title: "Prospectos y oportunidades",
  period: "Desde 2026-01-01 · Hasta 2026-01-31",
  filters: ["Vendedor: Todos", "Tipo: Oportunidades"],
  summary: [
    { label: "Prospectos", value: "12" },
    { label: "Oportunidades abiertas", value: "4" },
  ],
  headers: ["Cliente", "Vendedor", "Estado"],
  rows: [["Cliente de prueba", "Vendedora", "Abierto"]],
};

describe("prospect-opportunities exports", () => {
  it("creates an Excel workbook with summary and filtered detail", async () => {
    const buffer = await generateProspectOpportunitiesExcel(payload);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(["Resumen", "Detalle"]);
    expect(workbook.getWorksheet("Detalle")?.getCell("A2").value).toBe("Cliente de prueba");
    expect(workbook.getWorksheet("Resumen")?.getCell("A6").value).toBe("Prospectos");
  });

  it("creates a readable PDF attachment", async () => {
    const buffer = await generateProspectOpportunitiesPdf(payload);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1_000);
  });
});
