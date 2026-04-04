import { Router } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { requireSuperAdmin } from "../middlewares/superadmin";
import { validate } from "../middlewares/validate";
import adminController from "../controllers/AdminController";
import {
  criarClienteSchema,
  editarClienteSchema,
  editarClienteParamsSchema,
} from "../schemas/adminSchemas";

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
router.post(
  "/clientes",
  validate({ body: criarClienteSchema }),
  (req, res) => adminController.criarCliente(req as AuthRequest, res)
);

// PUT /api/admin/clientes/:id - Editar cliente
router.put(
  "/clientes/:id",
  validate({ body: editarClienteSchema, params: editarClienteParamsSchema }),
  (req, res) => adminController.editarCliente(req as AuthRequest, res)
);

// GET /api/admin/monitoramento - Monitoramento geral
router.get("/monitoramento", (req, res) =>
  adminController.monitoramento(req as AuthRequest, res)
);

export default router;
