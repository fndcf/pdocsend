import { Router } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { requireSuperAdmin } from "../middlewares/superadmin";
import adminController from "../controllers/AdminController";

const router = Router();

// Todas as rotas admin requerem auth + superadmin
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.use(requireAuth as any, requireSuperAdmin as any);

// GET /api/admin/clientes - Listar clientes
router.get("/clientes", (req, res) =>
  adminController.listarClientes(req as AuthRequest, res)
);

// GET /api/admin/pendentes - Usuários sem tenant
router.get("/pendentes", (req, res) =>
  adminController.listarPendentes(req as AuthRequest, res)
);

// POST /api/admin/clientes - Criar novo cliente
router.post("/clientes", (req, res) =>
  adminController.criarCliente(req as AuthRequest, res)
);

// PUT /api/admin/clientes/:id - Editar cliente
router.put("/clientes/:id", (req, res) =>
  adminController.editarCliente(req as unknown as AuthRequest, res)
);

// GET /api/admin/monitoramento - Monitoramento geral
router.get("/monitoramento", (req, res) =>
  adminController.monitoramento(req as AuthRequest, res)
);

export default router;
