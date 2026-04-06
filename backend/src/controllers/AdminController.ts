/**
 * Controller para painel administrativo (superadmin)
 */

import { Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { AuthRequest } from "../middlewares/auth";
import { invalidateUserCache } from "../middlewares/auth";
import { ResponseHelper } from "../utils/responseHelper";
import { auth } from "../config/firebase";
import logger from "../utils/logger";
import { encrypt } from "../utils/crypto";
import tenantRepository from "../repositories/TenantRepository";
import userRepository from "../repositories/UserRepository";
import loteRepository from "../repositories/LoteRepository";
import imovelEnviadoRepository from "../repositories/ImovelEnviadoRepository";

/**
 * Registra ação de auditoria no log estruturado.
 * Em produção, essas entradas são indexadas no Cloud Logging e podem ser
 * filtradas por severity=INFO e jsonPayload.audit=true.
 */
function auditLog(action: string, actor: string, details: Record<string, unknown>): void {
  logger.info(`[AUDIT] ${action}`, { audit: true, action, actor, ...details });
}

class AdminController {
  /**
   * Listar todos os clientes (tenants com usuários) - PAGINADO
   * GET /api/admin/clientes?cursor=xxx&limite=20
   */
  async listarClientes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limite = Math.min(parseInt(req.query.limite as string) || 20, 100);

      const result = await tenantRepository.listarPaginado(limite, cursor);
      const usersByTenant = await userRepository.listarPorTenant();

      const clientes = result.items.map((tenant) => ({
        id: tenant.id,
        nome: tenant.nome,
        mensagemTemplate: tenant.mensagemTemplate,
        zapiInstanceId: tenant.zapiInstanceId ? "***configurado***" : "",
        limiteDiario: tenant.limiteDiario || 200,
        usuarios: usersByTenant[tenant.id] || [],
        criadoEm: tenant.criadoEm,
      }));

      ResponseHelper.success(res, {
        clientes,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      });
    } catch (error) {
      logger.error("Erro ao listar clientes", {}, error);
      ResponseHelper.internalError(res, "Erro ao listar clientes");
    }
  }

  /**
   * Listar usuários pendentes (sem tenant vinculado)
   * GET /api/admin/pendentes
   */
  async listarPendentes(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const listResult = await auth.listUsers(100);
      const usersMap = await userRepository.listarPendentesIds();

      const pendentes = listResult.users
        .filter((user) => {
          const userData = usersMap.get(user.uid);
          return !userData || (!userData.tenantId && userData.role !== "superadmin");
        })
        .map((user) => ({
          uid: user.uid,
          email: user.email || "",
          criadoEm: user.metadata.creationTime,
        }));

      ResponseHelper.success(res, pendentes);
    } catch (error) {
      logger.error("Erro ao listar pendentes", {}, error);
      ResponseHelper.internalError(res, "Erro ao listar pendentes");
    }
  }

  /**
   * Configurar novo cliente (criar tenant + vincular usuário)
   * POST /api/admin/clientes
   */
  async criarCliente(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        uid,
        nome,
        nomeCorretor,
        nomeEmpresa,
        cargo,
        textoPersonalizado,
        zapiInstanceId,
        zapiToken,
        zapiClientToken,
        limiteDiario,
      } = req.body;

      // Verificar se usuário existe
      let userRecord;
      try {
        userRecord = await auth.getUser(uid);
      } catch {
        ResponseHelper.notFound(res, "Usuário não encontrado");
        return;
      }

      // Criar tenant (credenciais Z-API criptografadas)
      const tenantId = await tenantRepository.criar({
        nome,
        zapiInstanceId,
        zapiToken: encrypt(zapiToken),
        zapiClientToken: encrypt(zapiClientToken),
        mensagemTemplate: {
          nomeCorretor,
          nomeEmpresa,
          cargo: cargo || "corretor",
          ...(textoPersonalizado && { textoPersonalizado }),
        },
        limiteDiario,
      });

      // Vincular usuário ao tenant
      await userRepository.criar(uid, {
        email: userRecord.email || "",
        nome: nomeCorretor,
        tenantId,
        role: "admin",
      });

      // Invalidar cache do usuário (agora tem tenantId)
      invalidateUserCache(uid);

      auditLog("CRIAR_CLIENTE", req.user.uid, { tenantId, uid, nome });

      ResponseHelper.created(res, { tenantId, uid, nome }, "Cliente configurado com sucesso");
    } catch (error) {
      logger.error("Erro ao criar cliente", {}, error);
      ResponseHelper.internalError(res, "Erro ao criar cliente");
    }
  }

  /**
   * Editar tenant
   * PUT /api/admin/clientes/:id
   */
  async editarCliente(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nome, nomeCorretor, nomeEmpresa, cargo, textoPersonalizado, zapiInstanceId, zapiToken, zapiClientToken, limiteDiario } = req.body;

      const tenant = await tenantRepository.buscarPorId(id);

      if (!tenant) {
        ResponseHelper.notFound(res, "Cliente não encontrado");
        return;
      }

      const updateData: Record<string, unknown> = {};
      if (nome) updateData.nome = nome;
      if (zapiInstanceId) updateData.zapiInstanceId = zapiInstanceId;
      if (zapiToken) updateData.zapiToken = encrypt(zapiToken);
      if (zapiClientToken) updateData.zapiClientToken = encrypt(zapiClientToken);
      if (limiteDiario) updateData.limiteDiario = limiteDiario;
      if (nomeCorretor || nomeEmpresa || cargo || textoPersonalizado !== undefined) {
        const currentTemplate = tenant.mensagemTemplate || {};
        updateData.mensagemTemplate = {
          nomeCorretor: nomeCorretor || currentTemplate.nomeCorretor,
          nomeEmpresa: nomeEmpresa || currentTemplate.nomeEmpresa,
          cargo: cargo || currentTemplate.cargo,
          ...(textoPersonalizado !== undefined && { textoPersonalizado }),
        };
      }

      await tenantRepository.atualizar(id, updateData);

      auditLog("EDITAR_CLIENTE", req.user.uid, {
        tenantId: id,
        campos: Object.keys(updateData),
      });

      ResponseHelper.success(res, null, "Cliente atualizado");
    } catch (error) {
      logger.error("Erro ao editar cliente", { tenantId: req.params.id }, error);
      ResponseHelper.internalError(res, "Erro ao editar cliente");
    }
  }

  /**
   * Monitoramento - envios recentes de todos os tenants (PAGINADO, sem N+1)
   * GET /api/admin/monitoramento?cursor=xxx&limite=20
   *
   * Em vez de buscar lotes de cada tenant individualmente (N+1),
   * paginamos os tenants e buscamos lotes apenas da página atual.
   */
  async monitoramento(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limite = Math.min(parseInt(req.query.limite as string) || 20, 100);

      const result = await tenantRepository.listarPaginado(limite, cursor);

      // Buscar lotes recentes apenas dos tenants da página atual (max N queries, onde N = limite)
      const stats = await Promise.all(
        result.items.map(async (tenant) => {
          const lotes = await loteRepository.listarRecentes(tenant.id, 5);

          let totalEnviados = 0;
          let totalErros = 0;

          const lotesFormatados = lotes.map((lote) => {
            totalEnviados += lote.enviados || 0;
            totalErros += lote.erros || 0;
            return {
              id: lote.id,
              pdfOrigem: lote.pdfOrigem,
              totalEnvios: lote.totalEnvios,
              enviados: lote.enviados,
              erros: lote.erros,
              status: lote.status,
              criadoEm: lote.criadoEm,
            };
          });

          return {
            tenantId: tenant.id,
            nome: tenant.nome,
            corretor: tenant.mensagemTemplate?.nomeCorretor || "",
            totalEnviados,
            totalErros,
            lotesRecentes: lotesFormatados,
          };
        })
      );

      ResponseHelper.success(res, {
        stats,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      });
    } catch (error) {
      logger.error("Erro ao buscar monitoramento", {}, error);
      ResponseHelper.internalError(res, "Erro ao buscar monitoramento");
    }
  }

  /**
   * Limpa registros de imoveis_enviados mais antigos que X meses.
   * Processa em batches paginados para não dar timeout com muitos tenants.
   * POST /api/admin/cleanup
   */
  async cleanup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const meses = parseInt(req.body.meses as string) || 12;
      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - meses);
      const timestamp = Timestamp.fromDate(dataLimite);

      // Processar em batches de 50 tenants por vez
      const BATCH_SIZE = 50;
      let totalRemovidos = 0;
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const result = await tenantRepository.listarPaginado(BATCH_SIZE, cursor);

        for (const tenant of result.items) {
          const removidos = await imovelEnviadoRepository.limparAntigos(tenant.id, timestamp);
          totalRemovidos += removidos;
        }

        hasMore = result.hasMore;
        cursor = result.nextCursor;
      }

      auditLog("CLEANUP", req.user.uid, { meses, totalRemovidos });

      ResponseHelper.success(res, {
        meses,
        totalRemovidos,
        dataLimite: dataLimite.toISOString(),
      }, `${totalRemovidos} registro(s) removido(s)`);
    } catch (error) {
      logger.error("Erro ao executar cleanup", {}, error);
      ResponseHelper.internalError(res, "Erro ao executar cleanup");
    }
  }
}

export default new AdminController();
