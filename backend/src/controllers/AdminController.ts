/**
 * Controller para painel administrativo (superadmin)
 */

import { Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { AuthRequest } from "../middlewares/auth";
import { ResponseHelper } from "../utils/responseHelper";
import { db, auth } from "../config/firebase";
import logger from "../utils/logger";

class AdminController {
  /**
   * Listar todos os clientes (tenants com usuários)
   * GET /api/admin/clientes
   */
  async listarClientes(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantsSnapshot = await db.collection("tenants").get();
      const usersSnapshot = await db.collection("users").where("role", "!=", "superadmin").get();

      const usersByTenant: Record<string, Array<{ uid: string; email: string; nome: string; role: string }>> = {};
      for (const userDoc of usersSnapshot.docs) {
        const data = userDoc.data();
        if (!data.tenantId) continue;
        if (!usersByTenant[data.tenantId]) usersByTenant[data.tenantId] = [];
        usersByTenant[data.tenantId].push({
          uid: userDoc.id,
          email: data.email,
          nome: data.nome,
          role: data.role,
        });
      }

      const clientes = tenantsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nome,
          mensagemTemplate: data.mensagemTemplate,
          zapiInstanceId: data.zapiInstanceId ? "***configurado***" : "",
          limiteDiario: data.limiteDiario || 200,
          usuarios: usersByTenant[doc.id] || [],
          criadoEm: data.criadoEm,
        };
      });

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
      // Buscar todos os usuários do Firebase Auth
      const listResult = await auth.listUsers(100);

      // Buscar documentos de users no Firestore
      const usersSnapshot = await db.collection("users").get();
      const usersMap = new Map<string, { tenantId: string; role: string }>();
      for (const doc of usersSnapshot.docs) {
        const data = doc.data();
        usersMap.set(doc.id, { tenantId: data.tenantId, role: data.role });
      }

      // Filtrar usuários sem tenant (e que não são superadmin)
      const pendentes = listResult.users
        .filter((user) => {
          const userData = usersMap.get(user.uid);
          // Sem documento no Firestore ou sem tenant vinculado
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
        zapiInstanceId,
        zapiToken,
        zapiClientToken,
      } = req.body;

      if (!uid || !nome || !nomeCorretor || !nomeEmpresa || !zapiInstanceId || !zapiToken || !zapiClientToken) {
        ResponseHelper.badRequest(res, "Todos os campos são obrigatórios");
        return;
      }

      // Verificar se usuário existe
      let userRecord;
      try {
        userRecord = await auth.getUser(uid);
      } catch {
        ResponseHelper.notFound(res, "Usuário não encontrado");
        return;
      }

      const limiteDiario = req.body.limiteDiario ? parseInt(req.body.limiteDiario) : 200;

      // Criar tenant
      const tenantRef = db.collection("tenants").doc();
      await tenantRef.set({
        nome,
        zapiInstanceId,
        zapiToken,
        zapiClientToken,
        mensagemTemplate: {
          nomeCorretor,
          nomeEmpresa,
          cargo: cargo || "corretor",
        },
        limiteDiario,
        criadoEm: Timestamp.now(),
      });

      // Vincular usuário ao tenant
      await db.collection("users").doc(uid).set({
        email: userRecord.email || "",
        nome: nomeCorretor,
        tenantId: tenantRef.id,
        role: "admin",
        criadoEm: Timestamp.now(),
      });

      logger.info("Cliente criado via admin", {
        tenantId: tenantRef.id,
        uid,
        nome,
      });

      ResponseHelper.created(res, {
        tenantId: tenantRef.id,
        uid,
        nome,
      }, "Cliente configurado com sucesso");
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
      const { nome, nomeCorretor, nomeEmpresa, cargo, zapiInstanceId, zapiToken, zapiClientToken, limiteDiario } = req.body;

      const tenantRef = db.collection("tenants").doc(id);
      const tenantDoc = await tenantRef.get();

      if (!tenantDoc.exists) {
        ResponseHelper.notFound(res, "Cliente não encontrado");
        return;
      }

      const updateData: Record<string, unknown> = {};
      if (nome) updateData.nome = nome;
      if (zapiInstanceId) updateData.zapiInstanceId = zapiInstanceId;
      if (zapiToken) updateData.zapiToken = zapiToken;
      if (zapiClientToken) updateData.zapiClientToken = zapiClientToken;
      if (limiteDiario) updateData.limiteDiario = parseInt(limiteDiario);
      if (nomeCorretor || nomeEmpresa || cargo) {
        const currentTemplate = tenantDoc.data()?.mensagemTemplate || {};
        updateData.mensagemTemplate = {
          nomeCorretor: nomeCorretor || currentTemplate.nomeCorretor,
          nomeEmpresa: nomeEmpresa || currentTemplate.nomeEmpresa,
          cargo: cargo || currentTemplate.cargo,
        };
      }

      await tenantRef.update(updateData);

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
      const tenantsSnapshot = await db.collection("tenants").get();
      const stats = [];

      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantData = tenantDoc.data();
        const lotesSnapshot = await db
          .collection(`tenants/${tenantDoc.id}/lotes`)
          .orderBy("criadoEm", "desc")
          .limit(5)
          .get();

        let totalEnviados = 0;
        let totalErros = 0;

        const lotes = lotesSnapshot.docs.map((loteDoc) => {
          const data = loteDoc.data();
          totalEnviados += data.enviados || 0;
          totalErros += data.erros || 0;
          return {
            id: loteDoc.id,
            pdfOrigem: data.pdfOrigem,
            totalEnvios: data.totalEnvios,
            enviados: data.enviados,
            erros: data.erros,
            status: data.status,
            criadoEm: data.criadoEm,
          };
        });

        stats.push({
          tenantId: tenantDoc.id,
          nome: tenantData.nome,
          corretor: tenantData.mensagemTemplate?.nomeCorretor || "",
          totalEnviados,
          totalErros,
          lotesRecentes: lotes,
        });
      }

      ResponseHelper.success(res, stats);
    } catch (error) {
      logger.error("Erro ao buscar monitoramento", {}, error);
      ResponseHelper.internalError(res, "Erro ao buscar monitoramento");
    }
  }
}

export default new AdminController();
