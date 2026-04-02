import { Router } from "express";
import pdfRoutes from "./pdfRoutes";
import envioRoutes from "./envioRoutes";

const router = Router();

router.use("/pdf", pdfRoutes);
router.use("/envios", envioRoutes);

export default router;
