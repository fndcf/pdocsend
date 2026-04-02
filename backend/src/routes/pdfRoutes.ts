import { Router } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { uploadPdf } from "../middlewares/upload";
import pdfController from "../controllers/PdfController";

const router = Router();

// POST /api/pdf/processar - Upload e processamento do PDF
router.post("/processar", requireAuth, uploadPdf, (req, res) =>
  pdfController.processar(req as AuthRequest, res)
);

export default router;
