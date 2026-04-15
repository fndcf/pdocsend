/**
 * Service para limpeza, normalização e deduplicação dos dados extraídos do PDF
 */

import { ImovelBruto } from "./PdfParserService";
import { Contato, Imovel } from "../models/Imovel";
import { normalizarTelefone, extrairNome } from "../utils/phoneUtils";
import { limparValor, campoVazio, gerarHashImovel } from "../utils/textUtils";
import logger from "../utils/logger";

export interface ResultadoProcessamento {
  contatos: Contato[];
  telefoneInvalido: number;
}

class DataCleanerService {
  /**
   * Processa dados brutos do PDF/Excel e retorna contatos limpos, agrupados e deduplicados
   */
  processar(dadosBrutos: ImovelBruto[]): ResultadoProcessamento {
    // 1. Limpar cada imóvel individualmente
    let telefoneInvalido = 0;
    const imoveisLimpos: ImovelLimpo[] = [];

    for (const ib of dadosBrutos) {
      const result = this.limparImovel(ib);
      if (result === "telefone_invalido") {
        telefoneInvalido++;
      } else if (result !== null) {
        imoveisLimpos.push(result);
      }
    }

    // 2. Mesclar imóveis duplicados (mesmo hash - une locação + venda)
    const imoveisMesclados = this.deduplicarImoveis(imoveisLimpos);

    // 3. Filtrar imóveis que ficaram sem operação após mesclagem
    const imoveisComOperacao = imoveisMesclados.filter(
      (im) => im.valorVenda !== "" || im.valorLocacao !== ""
    );

    // 4. Agrupar por telefone
    const contatos = this.agruparPorTelefone(imoveisComOperacao);

    logger.info("Dados processados", {
      brutos: dadosBrutos.length,
      limpos: imoveisLimpos.length,
      telefoneInvalido,
      mesclados: imoveisMesclados.length,
      comOperacao: imoveisComOperacao.length,
      contatos: contatos.length,
    });

    return { contatos, telefoneInvalido };
  }

  /**
   * Limpa e normaliza um imóvel bruto.
   * Retorna "telefone_invalido" para diferenciar esse caso dos demais descartes.
   */
  private limparImovel(bruto: ImovelBruto): ImovelLimpo | "telefone_invalido" | null {
    const telefone = normalizarTelefone(bruto.telefone);
    if (!telefone || telefone.length < 10) return "telefone_invalido";

    const nome = extrairNome(bruto.proprietario);
    if (!nome || nome.length < 2) return null;

    const nomeLimpo = nome;
    const edificio = campoVazio(bruto.edificio) ? "" : bruto.edificio.trim();
    const endereco = bruto.endereco.trim();
    const numero = bruto.numero;
    const apartamento = campoVazio(bruto.apartamento) ? "" : bruto.apartamento;

    const valorLocacao = limparValor(bruto.locacao);
    const valorVenda = limparValor(bruto.venda);

    // Determinar operação
    const temLocacao = valorLocacao !== "";
    const temVenda = valorVenda !== "";

    let operacao: Imovel["operacao"];
    if (temVenda && temLocacao) {
      operacao = "venda e locacao";
    } else if (temVenda) {
      operacao = "venda";
    } else if (temLocacao) {
      operacao = "locacao";
    } else {
      // Sem operação definida - ainda incluir para possível mesclagem com outra entrada
      operacao = "venda"; // placeholder, será recalculado na mesclagem ou filtrado depois
    }

    // Se não tem referência do imóvel (sem edifício e sem endereço), pular
    if (!edificio && !endereco) return null;

    // Se não tem nenhuma operação e nenhum valor, pular
    if (!temLocacao && !temVenda) return null;

    const hash = gerarHashImovel(telefone, edificio, endereco, numero, apartamento);

    return {
      nome: nomeLimpo,
      telefone,
      edificio,
      endereco,
      numero,
      apartamento,
      operacao,
      valorVenda,
      valorLocacao,
      hash,
    };
  }

  /**
   * Mescla imóveis duplicados (mesmo hash)
   *
   * Quando o PDF tem o mesmo imóvel em duas linhas (uma com locação, outra com venda),
   * mescla os valores em uma única entrada com operação "venda e locacao".
   */
  private deduplicarImoveis(imoveis: ImovelLimpo[]): ImovelLimpo[] {
    const mapa = new Map<string, ImovelLimpo>();

    for (const im of imoveis) {
      const existente = mapa.get(im.hash);
      if (existente) {
        // Mesclar valores: preencher locação/venda que estiver vazio
        if (!existente.valorLocacao && im.valorLocacao) {
          existente.valorLocacao = im.valorLocacao;
        }
        if (!existente.valorVenda && im.valorVenda) {
          existente.valorVenda = im.valorVenda;
        }
        // Recalcular operação
        const temLocacao = existente.valorLocacao !== "";
        const temVenda = existente.valorVenda !== "";
        if (temVenda && temLocacao) {
          existente.operacao = "venda e locacao";
        } else if (temVenda) {
          existente.operacao = "venda";
        } else if (temLocacao) {
          existente.operacao = "locacao";
        }
      } else {
        mapa.set(im.hash, { ...im });
      }
    }

    return [...mapa.values()];
  }

  /**
   * Agrupa imóveis por telefone em contatos
   */
  private agruparPorTelefone(imoveis: ImovelLimpo[]): Contato[] {
    const grupos = new Map<string, ImovelLimpo[]>();

    for (const im of imoveis) {
      const existing = grupos.get(im.telefone) || [];
      existing.push(im);
      grupos.set(im.telefone, existing);
    }

    const contatos: Contato[] = [];

    for (const [telefone, ims] of grupos) {
      const nome = ims[0].nome; // Usar nome do primeiro imóvel
      const imoveis: Imovel[] = ims.map((im) => ({
        edificio: im.edificio,
        endereco: im.endereco,
        numero: im.numero,
        apartamento: im.apartamento,
        operacao: im.operacao,
        valorVenda: im.valorVenda,
        valorLocacao: im.valorLocacao,
      }));

      contatos.push({ nome, telefone, imoveis });
    }

    return contatos;
  }
}

interface ImovelLimpo {
  nome: string;
  telefone: string;
  edificio: string;
  endereco: string;
  numero: string;
  apartamento: string;
  operacao: Imovel["operacao"];
  valorVenda: string;
  valorLocacao: string;
  hash: string;
}

export default new DataCleanerService();
