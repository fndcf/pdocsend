import { Router } from "express";
import pdfRoutes from "./pdfRoutes";
import envioRoutes from "./envioRoutes";
import adminRoutes from "./adminRoutes";

const router = Router();

router.use("/pdf", pdfRoutes);
router.use("/envios", envioRoutes);
router.use("/admin", adminRoutes);

export default router;
