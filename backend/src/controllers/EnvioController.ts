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

class EnvioController {
  /**
   * Confirma envio e cria lote + tasks no Cloud Tasks
   * POST /api/envios/confirmar
   */
  async confirmar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId, uid } = req.user;
      const { contatos, pdfOrigem } = req.body as { contatos: ContatoComStatus[]; pdfOrigem: string };

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

      // Verificar rate limiting
      const limiteDiario = tenantData.limiteDiario || 200;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const inicioHoje = Timestamp.fromDate(hoje);

      const lotesHoje = await db
        .collection(`tenants/${tenantId}/lotes`)
        .where("criadoEm", ">=", inicioHoje)
        .get();

      let enviadosHoje = 0;
      for (const loteDoc of lotesHoje.docs) {
        const lote = loteDoc.data();
        enviadosHoje += lote.totalEnvios || 0;
      }

      if (enviadosHoje + contatosParaEnviar.length > limiteDiario) {
        const restante = Math.max(0, limiteDiario - enviadosHoje);
        ResponseHelper.badRequest(
          res,
          `Limite diário de ${limiteDiario} mensagens atingido. Você já agendou ${enviadosHoje} hoje. Restam ${restante} envios disponíveis.`
        );
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

  /**
   * Cancelar lote em andamento
   * POST /api/envios/lotes/:id/cancelar
   */
  async cancelarLote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;

      const loteRef = db.collection(`tenants/${tenantId}/lotes`).doc(id);
      const loteDoc = await loteRef.get();

      if (!loteDoc.exists) {
        ResponseHelper.notFound(res, "Lote não encontrado");
        return;
      }

      const loteData = loteDoc.data();
      if (loteData?.status !== "em_andamento") {
        ResponseHelper.badRequest(res, "Lote não está em andamento");
        return;
      }

      // Marcar todos os envios pendentes como cancelados
      const enviosSnapshot = await db
        .collection(`tenants/${tenantId}/lotes/${id}/envios`)
        .where("status", "in", ["pendente", "enviando"])
        .get();

      const batch = db.batch();
      let cancelados = 0;
      for (const envioDoc of enviosSnapshot.docs) {
        batch.update(envioDoc.ref, { status: "cancelado" });
        cancelados++;
      }
      await batch.commit();

      // Recontar totais
      const todosEnvios = await db
        .collection(`tenants/${tenantId}/lotes/${id}/envios`)
        .get();

      let enviados = 0;
      let erros = 0;
      for (const doc of todosEnvios.docs) {
        const status = doc.data().status;
        if (status === "enviado") enviados++;
        else if (status === "erro") erros++;
      }

      await loteRef.update({
        status: "finalizado",
        enviados,
        erros,
        finalizadoEm: Timestamp.now(),
      });

      logger.info("Lote cancelado", { tenantId, loteId: id, cancelados });

      ResponseHelper.success(res, null, `Envio cancelado. ${cancelados} mensagem(ns) cancelada(s)`);
    } catch (error) {
      logger.error("Erro ao cancelar lote", { loteId: req.params.id }, error);
      ResponseHelper.internalError(res, "Erro ao cancelar lote");
    }
  }

  /**
   * Cancelar envio individual
   * POST /api/envios/lotes/:id/envios/:envioId/cancelar
   */
  async cancelarEnvio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.user;
      const { id, envioId } = req.params;

      const envioRef = db
        .collection(`tenants/${tenantId}/lotes/${id}/envios`)
        .doc(envioId);
      const envioDoc = await envioRef.get();

      if (!envioDoc.exists) {
        ResponseHelper.notFound(res, "Envio não encontrado");
        return;
      }

      const envioData = envioDoc.data();
      if (envioData?.status !== "pendente") {
        ResponseHelper.badRequest(res, "Apenas envios pendentes podem ser cancelados");
        return;
      }

      await envioRef.update({ status: "cancelado" });

      // Verificar se todos os envios foram processados para finalizar o lote
      const loteRef = db.collection(`tenants/${tenantId}/lotes`).doc(id);
      const enviosSnapshot = await db
        .collection(`tenants/${tenantId}/lotes/${id}/envios`)
        .get();

      let enviados = 0;
      let erros = 0;
      let cancelados = 0;
      for (const doc of enviosSnapshot.docs) {
        const status = doc.data().status;
        if (status === "enviado") enviados++;
        else if (status === "erro") erros++;
        else if (status === "cancelado") cancelados++;
      }

      await loteRef.update({ enviados, erros });

      const loteDoc = await loteRef.get();
      const loteData = loteDoc.data();
      const processados = enviados + erros + cancelados;
      if (loteData && processados >= loteData.totalEnvios) {
        await loteRef.update({
          status: "finalizado",
          finalizadoEm: Timestamp.now(),
        });
      }

      logger.info("Envio individual cancelado", { tenantId, loteId: id, envioId });

      ResponseHelper.success(res, null, "Envio cancelado");
    } catch (error) {
      logger.error("Erro ao cancelar envio", { envioId: req.params.envioId }, error);
      ResponseHelper.internalError(res, "Erro ao cancelar envio");
    }
  }

  /**
   * Histórico de envios por telefone
   * GET /api/envios/contato/:telefone
   */
  async historicoPorContato(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.user;
      const { telefone } = req.params;

      // Buscar todos os imóveis enviados para este telefone
      const imoveisSnapshot = await db
        .collection(`tenants/${tenantId}/imoveis_enviados`)
        .where("telefone", "==", telefone)
        .get();

      if (imoveisSnapshot.empty) {
        ResponseHelper.success(res, { envios: [], total: 0 });
        return;
      }

      // Agrupar por loteId para buscar detalhes
      const loteIds = new Set<string>();
      const imoveis = imoveisSnapshot.docs.map((doc) => {
        const data = doc.data();
        loteIds.add(data.loteId);
        return { id: doc.id, ...data };
      });

      // Buscar detalhes dos lotes
      const lotes: Record<string, unknown> = {};
      for (const loteId of loteIds) {
        const loteDoc = await db
          .collection(`tenants/${tenantId}/lotes`)
          .doc(loteId)
          .get();
        if (loteDoc.exists) {
          lotes[loteId] = { id: loteDoc.id, ...loteDoc.data() };
        }
      }

      ResponseHelper.success(res, {
        telefone,
        envios: imoveis,
        lotes,
        total: imoveis.length,
      });
    } catch (error) {
      logger.error("Erro ao buscar histórico por contato", { telefone: req.params.telefone }, error);
      ResponseHelper.internalError(res, "Erro ao buscar histórico");
    }
  }

  /**
   * Dashboard - métricas do tenant
   * GET /api/envios/dashboard
   */
  async dashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.user;

      // Buscar limite diário do tenant
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      const limiteDiario = tenantDoc.data()?.limiteDiario || 200;

      // Início de hoje e início do mês
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const inicioHoje = Timestamp.fromDate(hoje);

      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioMesTs = Timestamp.fromDate(inicioMes);

      // Buscar lotes de hoje
      const lotesHoje = await db
        .collection(`tenants/${tenantId}/lotes`)
        .where("criadoEm", ">=", inicioHoje)
        .get();

      let enviadosHoje = 0;
      for (const doc of lotesHoje.docs) {
        enviadosHoje += doc.data().enviados || 0;
      }

      // Buscar lotes do mês
      const lotesMes = await db
        .collection(`tenants/${tenantId}/lotes`)
        .where("criadoEm", ">=", inicioMesTs)
        .get();

      let enviadosMes = 0;
      let errosMes = 0;
      let totalPdfs = 0;
      let ultimoEnvio: unknown = null;

      for (const doc of lotesMes.docs) {
        const data = doc.data();
        enviadosMes += data.enviados || 0;
        errosMes += data.erros || 0;
        totalPdfs++;
        if (!ultimoEnvio || (data.criadoEm && data.criadoEm > (ultimoEnvio as FirebaseFirestore.Timestamp))) {
          ultimoEnvio = data.criadoEm;
        }
      }

      ResponseHelper.success(res, {
        enviadosHoje,
        limiteDiario,
        enviadosMes,
        errosMes,
        totalPdfs,
        ultimoEnvio,
      });
    } catch (error) {
      logger.error("Erro ao buscar dashboard", { tenantId: req.user?.tenantId }, error);
      ResponseHelper.internalError(res, "Erro ao buscar métricas");
    }
  }
}

export default new EnvioController();
