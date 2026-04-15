/**
 * Service para extração de dados de imóveis a partir de arquivos Excel (.xlsx)
 *
 * Colunas esperadas (ordem baseada no modelo padrão):
 * 0: Logradouro, 1: Nro., 2: Apto., 3: Complemento, 4: Bairro,
 * 5: Proprietário, 6: Tel. Proprietário, 7-12: dados do imóvel (ignorados),
 * 13: Venda (número), 14: Locação (número), 15: Cond. (ignorado), 16: Condomínio
 */

import * as XLSX from "xlsx";
import { ImovelBruto } from "./PdfParserService";
import logger from "../utils/logger";

function formatarValorMonetario(valor: number): string {
  if (!valor || valor === 0) return "";
  const [inteiros, decimais] = valor.toFixed(2).split(".");
  const inteirosFormatado = inteiros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$${inteirosFormatado},${decimais}`;
}

class ExcelParserService {
  /**
   * Extrai dados brutos de imóveis de um buffer Excel (.xlsx)
   */
  extrairDoExcel(buffer: Buffer): ImovelBruto[] {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

    if (rows.length < 2) {
      logger.warn("Excel sem dados", { totalLinhas: rows.length });
      return [];
    }

    const result: ImovelBruto[] = [];

    // Linha 0 = cabeçalho, ignorar
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      if (!row || row.length === 0) continue;

      const endereco = String(row[0] ?? "").trim();
      const numero = String(row[1] ?? "").trim();
      const apartamento = String(row[2] ?? "").trim();
      const proprietario = String(row[5] ?? "").trim();
      const telefone = String(row[6] ?? "").trim();
      const venda = formatarValorMonetario(Number(row[13]) || 0);
      const locacao = formatarValorMonetario(Number(row[14]) || 0);
      const edificio = String(row[16] ?? "").trim();

      // Pular linhas sem dados essenciais
      if (!endereco || !proprietario || !telefone) continue;

      result.push({
        edificio,
        endereco,
        numero,
        apartamento,
        proprietario,
        telefone,
        locacao,
        venda,
      });
    }

    logger.info("Excel parseado", {
      totalLinhas: rows.length - 1,
      totalExtraidos: result.length,
    });

    return result;
  }
}

export default new ExcelParserService();
