/**
 * Service para deduplicação de imóveis entre PDFs usando Firestore
 */

import { db } from "../config/firebase";
import { Contato, Imovel } from "../models/Imovel";
import { ContatoComStatus } from "../models/Imovel";
import { gerarHashImovel } from "../utils/textUtils";
import logger from "../utils/logger";

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
    const hashesExistentes = await this.buscarHashesExistentes(
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
   * Busca quais hashes já existem na collection imoveis_enviados
   */
  private async buscarHashesExistentes(
    tenantId: string,
    hashes: string[]
  ): Promise<Set<string>> {
    const existentes = new Set<string>();
    if (hashes.length === 0) return existentes;

    // Firestore limita IN queries a 30 itens
    const BATCH_SIZE = 30;
    for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
      const batch = hashes.slice(i, i + BATCH_SIZE);
      const snapshot = await db
        .collection(`tenants/${tenantId}/imoveis_enviados`)
        .where("__name__", "in", batch)
        .get();

      for (const doc of snapshot.docs) {
        existentes.add(doc.id);
      }
    }

    return existentes;
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
    const batch = db.batch();
    const agora = new Date();

    for (const imovel of imoveis) {
      const hash = gerarHashImovel(
        telefone,
        imovel.edificio,
        imovel.endereco,
        imovel.numero,
        imovel.apartamento
      );

      const ref = db
        .collection(`tenants/${tenantId}/imoveis_enviados`)
        .doc(hash);

      batch.set(ref, {
        telefone,
        edificio: imovel.edificio,
        endereco: imovel.endereco,
        numero: imovel.numero,
        apartamento: imovel.apartamento,
        loteId,
        envioId,
        enviadoEm: agora,
      });
    }

    await batch.commit();
  }
}

export default new DeduplicacaoService();
