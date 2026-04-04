import { Router } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import envioController from "../controllers/EnvioController";
import {
  confirmarEnvioSchema,
  cancelarLoteParamsSchema,
  cancelarEnvioParamsSchema,
  contatoTelefoneParamsSchema,
} from "../schemas/envioSchemas";

const router = Router();

// POST /api/envios/confirmar - Confirmar envio de mensagens
router.post(
  "/confirmar",
  requireAuth,
  validate({ body: confirmarEnvioSchema }),
  (req, res) => envioController.confirmar(req as AuthRequest, res)
);

// GET /api/envios/lotes - Listar lotes de envio
router.get("/lotes", requireAuth, (req, res) =>
  envioController.listarLotes(req as AuthRequest, res)
);

// GET /api/envios/lotes/:id - Detalhes de um lote
router.get(
  "/lotes/:id",
  requireAuth,
  validate({ params: cancelarLoteParamsSchema }),
  (req, res) => envioController.detalhesLote(req as AuthRequest, res)
);

// POST /api/envios/lotes/:id/cancelar - Cancelar lote inteiro
router.post(
  "/lotes/:id/cancelar",
  requireAuth,
  validate({ params: cancelarLoteParamsSchema }),
  (req, res) => envioController.cancelarLote(req as AuthRequest, res)
);

// POST /api/envios/lotes/:id/envios/:envioId/cancelar - Cancelar envio individual
router.post(
  "/lotes/:id/envios/:envioId/cancelar",
  requireAuth,
  validate({ params: cancelarEnvioParamsSchema }),
  (req, res) => envioController.cancelarEnvio(req as AuthRequest, res)
);

// GET /api/envios/contato/:telefone - Histórico de envios por telefone
router.get(
  "/contato/:telefone",
  requireAuth,
  validate({ params: contatoTelefoneParamsSchema }),
  (req, res) => envioController.historicoPorContato(req as AuthRequest, res)
);

// GET /api/envios/dashboard - Métricas do dashboard
router.get("/dashboard", requireAuth, (req, res) =>
  envioController.dashboard(req as AuthRequest, res)
);

export default router;
