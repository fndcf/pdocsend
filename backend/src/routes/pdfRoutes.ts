import { Router } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { uploadPdf } from "../middlewares/upload";
import pdfController from "../controllers/PdfController";

const router = Router();

// POST /api/pdf/processar - Upload e processamento do PDF
// Nota: validação do filtroOperacao é feita no PdfController após uploadPdf extrair os formFields
router.post("/processar", requireAuth, uploadPdf, (req, res) =>
  pdfController.processar(req as AuthRequest, res)
);

export default router;
