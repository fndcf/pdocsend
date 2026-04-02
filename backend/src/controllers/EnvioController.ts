/**
 * Controller para gerenciar envios de mensagens
 */

import { Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { AuthRequest } from "../middlewares/auth";
import { ResponseHelper } from "../utils/responseHelper";
import { db } from "../config/firebase";
import messageBuilderService from "../services/MessageBuilderService";
import filaEnvioService from "../services/FilaEnvioService";
import logger from "../utils/logger";
import { ContatoComStatus } from "../models/Imovel";

interface ConfirmarEnvioBody {
  contatos: ContatoComStatus[];
  pdfOrigem: string;
}

class EnvioController {
  /**
   * Confirma envio e cria lote + tasks no Cloud Tasks
   * POST /api/envios/confirmar
   */
  async confirmar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, uid } = req.user;
      const { contatos, pdfOrigem } = req.body as ConfirmarEnvioBody;

      // Filtrar apenas contatos novos
      const contatosParaEnviar = contatos.filter((c) => c.status === "novo");

      if (contatosParaEnviar.length === 0) {
        ResponseHelper.badRequest(res, "Nenhum contato novo para enviar");
        return;
      }

      // Buscar template do tenant
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      const tenantData = tenantDoc.data();

      if (!tenantData) {
        ResponseHelper.badRequest(res, "Tenant não encontrado");
        return;
      }

      const agora = Timestamp.now();

      // 1. Criar lote
      const loteRef = db.collection(`tenants/${tenantId}/lotes`).doc();
      await loteRef.set({
        totalEnvios: contatosParaEnviar.length,
        enviados: 0,
        erros: 0,
        status: "em_andamento",
        pdfOrigem,
        criadoPor: uid,
        criadoEm: agora,
        finalizadoEm: null,
      });

      // 2. Criar documentos de envio
      const payloads = [];

      for (const contato of contatosParaEnviar) {
        const envioRef = db
          .collection(`tenants/${tenantId}/lotes/${loteRef.id}/envios`)
          .doc();

        const nomeContato = messageBuilderService.montarNomeContato(contato);

        await envioRef.set({
          telefone: contato.telefone,
          nome: contato.nome,
          nomeContato,
          imoveis: contato.imoveis,
          mensagem: "", // Será gerada no momento do envio (saudação dinâmica)
          status: "pendente",
          erro: "",
          enviadoEm: null,
          criadoEm: agora,
        });

        payloads.push({
          tenantId,
          loteId: loteRef.id,
          envioId: envioRef.id,
        });
      }

      // 3. Criar tasks no Cloud Tasks
      const functionUrl = `https://southamerica-east1-${tenantData.projectId || "pdocsend"}.cloudfunctions.net/processarEnvio`;

      try {
        await filaEnvioService.criarTasks(payloads, functionUrl);
      } catch (error) {
        logger.error("Erro ao criar tasks, atualizando lote", { loteId: loteRef.id }, error);
        await loteRef.update({ status: "cancelado" });
        ResponseHelper.internalError(res, "Erro ao agendar envios");
        return;
      }

      logger.info("Envio confirmado", {
        tenantId,
        loteId: loteRef.id,
        totalEnvios: contatosParaEnviar.length,
      });

      ResponseHelper.created(
        res,
        {
          loteId: loteRef.id,
          totalEnvios: contatosParaEnviar.length,
        },
        `${contatosParaEnviar.length} envio(s) agendado(s)`
      );
    } catch (error) {
      logger.error("Erro ao confirmar envio", { tenantId: req.user?.tenantId }, error);
      ResponseHelper.internalError(res, "Erro ao confirmar envio");
    }
  }

  /**
   * Lista lotes de envio do tenant
   * GET /api/envios/lotes
   */
  async listarLotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.user;

      const snapshot = await db
        .collection(`tenants/${tenantId}/lotes`)
        .orderBy("criadoEm", "desc")
        .limit(50)
        .get();

      const lotes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      ResponseHelper.success(res, lotes);
    } catch (error) {
      logger.error("Erro ao listar lotes", { tenantId: req.user?.tenantId }, error);
      ResponseHelper.internalError(res, "Erro ao listar lotes");
    }
  }

  /**
   * Detalhes de um lote com seus envios
   * GET /api/envios/lotes/:id
   */
  async detalhesLote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;

      const loteDoc = await db
        .collection(`tenants/${tenantId}/lotes`)
        .doc(id)
        .get();

      if (!loteDoc.exists) {
        ResponseHelper.notFound(res, "Lote não encontrado");
        return;
      }

      const enviosSnapshot = await db
        .collection(`tenants/${tenantId}/lotes/${id}/envios`)
        .orderBy("criadoEm", "asc")
        .get();

      const envios = enviosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      ResponseHelper.success(res, {
        lote: { id: loteDoc.id, ...loteDoc.data() },
        envios,
      });
    } catch (error) {
      logger.error("Erro ao buscar detalhes do lote", { loteId: req.params.id }, error);
      ResponseHelper.internalError(res, "Erro ao buscar detalhes do lote");
    }
  }
}

export default new EnvioController();
