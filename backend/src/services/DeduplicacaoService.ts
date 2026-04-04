/**
 * Service para deduplicação de imóveis entre PDFs
 */

import { Contato, Imovel } from "../models/Imovel";
import { ContatoComStatus } from "../models/Imovel";
import { gerarHashImovel } from "../utils/textUtils";
import logger from "../utils/logger";
import imovelEnviadoRepository from "../repositories/ImovelEnviadoRepository";

class DeduplicacaoService {
  /**
   * Verifica quais contatos/imóveis já foram enviados anteriormente
   * Retorna contatos com status (novo ou ja_enviado) e apenas imóveis novos
   */
  async verificar(
    tenantId: string,
    contatos: Contato[]
  ): Promise<ContatoComStatus[]> {
    // Gerar todos os hashes
    const todosHashes = new Set<string>();
    for (const contato of contatos) {
      for (const imovel of contato.imoveis) {
        const hash = gerarHashImovel(
          contato.telefone,
          imovel.edificio,
          imovel.endereco,
          imovel.numero,
          imovel.apartamento
        );
        todosHashes.add(hash);
      }
    }

    // Buscar quais hashes já existem no Firestore
    const hashesExistentes = await imovelEnviadoRepository.buscarHashesExistentes(
      tenantId,
      [...todosHashes]
    );

    // Classificar contatos
    const resultado: ContatoComStatus[] = [];

    for (const contato of contatos) {
      const hashesNovos: string[] = [];
      const hashesJaEnviados: string[] = [];
      const imoveisNovos: Imovel[] = [];

      for (const imovel of contato.imoveis) {
        const hash = gerarHashImovel(
          contato.telefone,
          imovel.edificio,
          imovel.endereco,
          imovel.numero,
          imovel.apartamento
        );

        if (hashesExistentes.has(hash)) {
          hashesJaEnviados.push(hash);
        } else {
          hashesNovos.push(hash);
          imoveisNovos.push(imovel);
        }
      }

      if (imoveisNovos.length > 0) {
        resultado.push({
          nome: contato.nome,
          telefone: contato.telefone,
          imoveis: imoveisNovos,
          status: "novo",
          hashesNovos,
          hashesExistentes: hashesJaEnviados,
        });
      } else {
        resultado.push({
          nome: contato.nome,
          telefone: contato.telefone,
          imoveis: contato.imoveis,
          status: "ja_enviado",
          hashesNovos: [],
          hashesExistentes: hashesJaEnviados,
        });
      }
    }

    const novos = resultado.filter((c) => c.status === "novo").length;
    const jaEnviados = resultado.filter((c) => c.status === "ja_enviado").length;

    logger.info("Deduplicação concluída", {
      total: contatos.length,
      novos,
      jaEnviados,
    });

    return resultado;
  }

  /**
   * Registra imóveis como enviados após envio bem-sucedido
   */
  async registrarEnviados(
    tenantId: string,
    telefone: string,
    imoveis: Imovel[],
    loteId: string,
    envioId: string
  ): Promise<void> {
    await imovelEnviadoRepository.registrarEnviados(
      tenantId,
      telefone,
      imoveis,
      loteId,
      envioId
    );
  }
}

export default new DeduplicacaoService();
