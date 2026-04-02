import { Router } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import envioController from "../controllers/EnvioController";

const router = Router();

// POST /api/envios/confirmar - Confirmar envio de mensagens
router.post("/confirmar", requireAuth, (req, res) =>
  envioController.confirmar(req as AuthRequest, res)
);

// GET /api/envios/lotes - Listar lotes de envio
router.get("/lotes", requireAuth, (req, res) =>
  envioController.listarLotes(req as AuthRequest, res)
);

// GET /api/envios/lotes/:id - Detalhes de um lote
router.get("/lotes/:id", requireAuth, (req, res) =>
  envioController.detalhesLote(req as AuthRequest, res)
);

export default router;
