/**
 * Service para extração de dados de imóveis a partir de PDFs
 * Usa pdf.js-extract (engine Mozilla) para extração precisa de texto
 */

import { PDFExtract, PDFExtractResult } from "pdf.js-extract";
import logger from "../utils/logger";

export interface ImovelBruto {
  edificio: string;
  endereco: string;
  numero: string;
  apartamento: string;
  proprietario: string;
  telefone: string;
  locacao: string;
  venda: string;
}

const pdfExtract = new PDFExtract();

class PdfParserService {
  /**
   * Extrai dados brutos de imóveis de um buffer PDF
   */
  async extrairDoPdf(buffer: Buffer): Promise<ImovelBruto[]> {
    const fullText = await this.extrairTexto(buffer);
    return this.parseTexto(fullText);
  }

  /**
   * Extrai todo o texto do PDF concatenado
   */
  private async extrairTexto(buffer: Buffer): Promise<string> {
    try {
      const data: PDFExtractResult = await pdfExtract.extractBuffer(buffer, {});
      let fullText = "";
      for (const page of data.pages) {
        fullText += page.content.map((item) => item.str).join(" ") + " ";
      }
      return fullText;
    } catch (err) {
      logger.error("Erro ao parsear PDF", {}, err);
      throw new Error("Erro ao processar o PDF. Verifique se o arquivo é válido.");
    }
  }

  /**
   * Faz o parsing do texto extraído em blocos de imóveis
   */
  parseTexto(fullText: string): ImovelBruto[] {
    // Dividir por blocos de imóvel
    const blocos = fullText.split(/Informações do imóvel/);
    const imoveis: ImovelBruto[] = [];

    // Primeiro bloco é lixo (antes do primeiro imóvel)
    for (let i = 1; i < blocos.length; i++) {
      const bloco = blocos[i];
      const imovel = this.extrairBloco(bloco);
      if (imovel) {
        imoveis.push(imovel);
      }
    }

    logger.info("PDF parseado", {
      blocos: blocos.length - 1,
      imoveisExtraidos: imoveis.length,
    });

    return imoveis;
  }

  /**
   * Extrai dados de um bloco individual de imóvel
   */
  private extrairBloco(bloco: string): ImovelBruto | null {
    // Proprietário e Telefone são obrigatórios
    const propMatch = bloco.match(
      /Proprietário\s+(.+?)\s+Telefone\s+([\d\s+]+)\s+E-mail/
    );
    if (!propMatch) return null;

    const proprietario = propMatch[1].trim();
    const telefone = propMatch[2].replace(/[\s+]/g, "").trim();

    // Edifício
    const edMatch = bloco.match(/Edfício\s+(.+?)\s+(?:Campo\s*Belo|Referência)/);
    const edificio = edMatch ? edMatch[1].trim() : "-";

    // Endereço
    const endMatch = bloco.match(/Endereço\s+(.+?)\s+Número/);
    const endereco = endMatch ? endMatch[1].trim() : "";

    // Número da rua
    const numMatch = bloco.match(/Número\s+(\S+)/);
    const numero = numMatch ? numMatch[1].trim() : "";

    // Apartamento: "Apt {valor} Bloco" (não confundir com "Apt/Andar")
    const aptMatch = bloco.match(/\bApt\s+(\S+)\s+Bloco/);
    const apartamento = aptMatch ? aptMatch[1].trim() : "-";

    // Locação
    const locMatch = bloco.match(/Locação\s+(R\$\S+)/);
    const locacao = locMatch ? locMatch[1].trim() : "";

    // Venda: pegar o valor após "Venda" que vem depois de "Locação"
    const venMatch = bloco.match(/Locação\s+\S+\s+Venda\s+(R\$[\d.,]+)/);
    const venda = venMatch ? venMatch[1].trim() : "";

    return {
      edificio,
      endereco,
      numero,
      apartamento,
      proprietario,
      telefone,
      locacao,
      venda,
    };
  }
}

export default new PdfParserService();
