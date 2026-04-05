/**
 * Controller para gerenciar envios de mensagens
 */

import { Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { AuthRequest } from "../middlewares/auth";
import { ResponseHelper } from "../utils/responseHelper";
import messageBuilderService from "../services/MessageBuilderService";
import filaEnvioService from "../services/FilaEnvioService";
import logger from "../utils/logger";
import { ContatoComStatus } from "../models/Imovel";
import tenantRepository from "../repositories/TenantRepository";
import loteRepository from "../repositories/LoteRepository";
import envioRepository from "../repositories/EnvioRepository";
import imovelEnviadoRepository from "../repositories/ImovelEnviadoRepository";
import { db } from "../config/firebase";

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
      const tenant = await tenantRepository.buscarPorId(tenantId);

      if (!tenant) {
        ResponseHelper.badRequest(res, "Tenant não encontrado");
        return;
      }

      // Verificar limite diário e criar lote em transação (atomicidade)
      const limiteDiario = tenant.limiteDiario || 200;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const inicioHoje = Timestamp.fromDate(hoje);

      const loteResult = await db.runTransaction<{ error: string } | { loteId: string }>(async (transaction) => {
        const lotesSnapshot = await transaction.get(
          db.collection(`tenants/${tenantId}/lotes`)
            .where("criadoEm", ">=", inicioHoje)
        );

        let enviadosHoje = 0;
        for (const doc of lotesSnapshot.docs) {
          enviadosHoje += (doc.data().totalEnvios as number) || 0;
        }

        if (enviadosHoje + contatosParaEnviar.length > limiteDiario) {
          const restante = Math.max(0, limiteDiario - enviadosHoje);
          return { error: `Limite diário de ${limiteDiario} mensagens atingido. Você já agendou ${enviadosHoje} hoje. Restam ${restante} envios disponíveis.` };
        }

        // Criar lote dentro da transação
        const loteRef = db.collection(`tenants/${tenantId}/lotes`).doc();
        transaction.set(loteRef, {
          totalEnvios: contatosParaEnviar.length,
          pdfOrigem,
          criadoPor: uid,
          enviados: 0,
          erros: 0,
          status: "em_andamento",
          criadoEm: Timestamp.now(),
          finalizadoEm: null,
        });

        return { loteId: loteRef.id };
      });

      if ("error" in loteResult) {
        ResponseHelper.badRequest(res, loteResult.error);
        return;
      }

      const { loteId } = loteResult;

      // 2. Criar documentos de envio
      const payloads = [];

      for (const contato of contatosParaEnviar) {
        const nomeContato = messageBuilderService.montarNomeContato(contato);

        const envioId = await envioRepository.criar(tenantId, loteId, {
          telefone: contato.telefone,
          nome: contato.nome,
          nomeContato,
          imoveis: contato.imoveis,
          mensagem: (contato as unknown as Record<string, unknown>).mensagemPreview as string || "",
        });

        payloads.push({ tenantId, loteId, envioId });
      }

      // 3. Criar tasks no Cloud Tasks
      const functionUrl = `https://southamerica-east1-pdocsend.cloudfunctions.net/processarEnvio`;

      try {
        await filaEnvioService.criarTasks(payloads, functionUrl);
      } catch (error) {
        logger.error("Erro ao criar tasks, atualizando lote", { loteId }, error);
        await loteRepository.atualizarStatus(tenantId, loteId, "cancelado");
        ResponseHelper.internalError(res, "Erro ao agendar envios");
        return;
      }

      logger.info("Envio confirmado", {
        tenantId,
        loteId,
        totalEnvios: contatosParaEnviar.length,
      });

      ResponseHelper.created(
        res,
        {
          loteId,
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
      const cursor = req.query.cursor as string | undefined;
      const limite = Math.min(parseInt(req.query.limite as string) || 20, 100);
      const result = await loteRepository.listarPorTenant(tenantId, limite, cursor);
      ResponseHelper.success(res, result);
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

      const lote = await loteRepository.buscarPorId(tenantId, id);

      if (!lote) {
        ResponseHelper.notFound(res, "Lote não encontrado");
        return;
      }

      const envios = await envioRepository.listarPorLote(tenantId, id);

      ResponseHelper.success(res, { lote, envios });
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

      const lote = await loteRepository.buscarPorId(tenantId, id);

      if (!lote) {
        ResponseHelper.notFound(res, "Lote não encontrado");
        return;
      }

      if ((lote as Record<string, unknown>).status !== "em_andamento") {
        ResponseHelper.badRequest(res, "Lote não está em andamento");
        return;
      }

      // Marcar todos os envios pendentes como cancelados
      const cancelados = await envioRepository.cancelarPendentes(tenantId, id);

      // Recontar totais e finalizar
      const contadores = await envioRepository.contarPorStatus(tenantId, id);
      await loteRepository.finalizar(tenantId, id, contadores);

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

      const envio = await envioRepository.buscarPorId(tenantId, id, envioId);

      if (!envio) {
        ResponseHelper.notFound(res, "Envio não encontrado");
        return;
      }

      if ((envio as Record<string, unknown>).status !== "pendente") {
        ResponseHelper.badRequest(res, "Apenas envios pendentes podem ser cancelados");
        return;
      }

      await envioRepository.atualizarStatus(tenantId, id, envioId, "cancelado");

      // Recontar e verificar se lote finalizou
      const contadores = await envioRepository.contarPorStatus(tenantId, id);
      await loteRepository.atualizarContadores(tenantId, id, {
        enviados: contadores.enviados,
        erros: contadores.erros,
      });

      const lote = await loteRepository.buscarPorId(tenantId, id);
      const processados = contadores.enviados + contadores.erros + contadores.cancelados;
      if (lote && processados >= ((lote as Record<string, unknown>).totalEnvios as number)) {
        await loteRepository.finalizar(tenantId, id, contadores);
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

      const imoveis = await imovelEnviadoRepository.buscarPorTelefone(tenantId, telefone);

      if (imoveis.length === 0) {
        ResponseHelper.success(res, { envios: [], total: 0 });
        return;
      }

      // Agrupar por loteId para buscar detalhes
      const loteIds = new Set<string>();
      for (const imovel of imoveis) {
        loteIds.add((imovel as Record<string, unknown>).loteId as string);
      }

      const lotes: Record<string, unknown> = {};
      for (const loteId of loteIds) {
        const lote = await loteRepository.buscarPorId(tenantId, loteId);
        if (lote) {
          lotes[loteId] = lote;
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

      if (!tenantId) {
        ResponseHelper.success(res, {
          enviadosHoje: 0,
          limiteDiario: 0,
          enviadosMes: 0,
          errosMes: 0,
          totalPdfs: 0,
          ultimoEnvio: null,
        });
        return;
      }

      // Buscar limite diário do tenant
      const tenant = await tenantRepository.buscarPorId(tenantId);
      const limiteDiario = tenant?.limiteDiario || 200;

      // Início de hoje e início do mês
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const inicioHoje = Timestamp.fromDate(hoje);

      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioMesTs = Timestamp.fromDate(inicioMes);

      // Buscar lotes de hoje
      const lotesHoje = await loteRepository.listarDesde(tenantId, inicioHoje);

      let enviadosHoje = 0;
      for (const lote of lotesHoje) {
        enviadosHoje += (lote as Record<string, unknown>).enviados as number || 0;
      }

      // Buscar lotes do mês
      const lotesMes = await loteRepository.listarDesde(tenantId, inicioMesTs);

      let enviadosMes = 0;
      let errosMes = 0;
      let totalPdfs = 0;
      let ultimoEnvio: unknown = null;

      for (const lote of lotesMes) {
        const data = lote as Record<string, unknown>;
        enviadosMes += data.enviados as number || 0;
        errosMes += data.erros as number || 0;
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
