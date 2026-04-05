/**
 * Controller para painel administrativo (superadmin)
 */

import { Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { AuthRequest } from "../middlewares/auth";
import { ResponseHelper } from "../utils/responseHelper";
import { auth } from "../config/firebase";
import logger from "../utils/logger";
import tenantRepository from "../repositories/TenantRepository";
import userRepository from "../repositories/UserRepository";
import loteRepository from "../repositories/LoteRepository";
import imovelEnviadoRepository from "../repositories/ImovelEnviadoRepository";

class AdminController {
  /**
   * Listar todos os clientes (tenants com usuários)
   * GET /api/admin/clientes
   */
  async listarClientes(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenants = await tenantRepository.listarTodos();
      const usersByTenant = await userRepository.listarPorTenant();

      const clientes = tenants.map((tenant) => ({
        id: tenant.id,
        nome: tenant.nome,
        mensagemTemplate: tenant.mensagemTemplate,
        zapiInstanceId: tenant.zapiInstanceId ? "***configurado***" : "",
        limiteDiario: tenant.limiteDiario || 200,
        usuarios: usersByTenant[tenant.id] || [],
        criadoEm: tenant.criadoEm,
      }));

      ResponseHelper.success(res, clientes);
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
      const usersMap = await userRepository.listarTodos();

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

      // Criar tenant
      const tenantId = await tenantRepository.criar({
        nome,
        zapiInstanceId,
        zapiToken,
        zapiClientToken,
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

      logger.info("Cliente criado via admin", { tenantId, uid, nome });

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
      if (zapiToken) updateData.zapiToken = zapiToken;
      if (zapiClientToken) updateData.zapiClientToken = zapiClientToken;
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

      logger.info("Cliente atualizado", { tenantId: id });

      ResponseHelper.success(res, null, "Cliente atualizado");
    } catch (error) {
      logger.error("Erro ao editar cliente", { tenantId: req.params.id }, error);
      ResponseHelper.internalError(res, "Erro ao editar cliente");
    }
  }

  /**
   * Monitoramento - envios recentes de todos os tenants
   * GET /api/admin/monitoramento
   */
  async monitoramento(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenants = await tenantRepository.listarTodos();
      const stats = [];

      for (const tenant of tenants) {
        const lotes = await loteRepository.listarRecentes(tenant.id, 5);

        let totalEnviados = 0;
        let totalErros = 0;

        const lotesFormatados = lotes.map((lote) => {
          const data = lote as Record<string, unknown>;
          totalEnviados += data.enviados as number || 0;
          totalErros += data.erros as number || 0;
          return {
            id: lote.id,
            pdfOrigem: data.pdfOrigem,
            totalEnvios: data.totalEnvios,
            enviados: data.enviados,
            erros: data.erros,
            status: data.status,
            criadoEm: data.criadoEm,
          };
        });

        stats.push({
          tenantId: tenant.id,
          nome: tenant.nome,
          corretor: tenant.mensagemTemplate?.nomeCorretor || "",
          totalEnviados,
          totalErros,
          lotesRecentes: lotesFormatados,
        });
      }

      ResponseHelper.success(res, stats);
    } catch (error) {
      logger.error("Erro ao buscar monitoramento", {}, error);
      ResponseHelper.internalError(res, "Erro ao buscar monitoramento");
    }
  }

  /**
   * Limpa registros de imoveis_enviados mais antigos que X meses
   * POST /api/admin/cleanup
   */
  async cleanup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const meses = parseInt(req.body.meses as string) || 12;
      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - meses);
      const timestamp = Timestamp.fromDate(dataLimite);

      const tenants = await tenantRepository.listarTodos();
      let totalRemovidos = 0;

      for (const tenant of tenants) {
        const tenantId = tenant.id;
        const removidos = await imovelEnviadoRepository.limparAntigos(tenantId, timestamp);
        totalRemovidos += removidos;
      }

      logger.info("Cleanup executado", { meses, totalRemovidos });

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
