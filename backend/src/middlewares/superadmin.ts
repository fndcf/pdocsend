import { Response, NextFunction } from "express";
import { db } from "../config/firebase";
import { AuthRequest } from "./auth";

export async function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ success: false, error: "Não autenticado" });
      return;
    }

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "superadmin") {
      res.status(403).json({ success: false, error: "Acesso restrito" });
      return;
    }

    next();
  } catch {
    res.status(500).json({ success: false, error: "Erro ao verificar permissões" });
  }
}
