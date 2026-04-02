import { Request, Response, NextFunction } from "express";
import { auth, db } from "../config/firebase";
import logger from "../utils/logger";

export interface AuthRequest extends Request {
  user: {
    uid: string;
    email: string;
    tenantId: string;
  };
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "Token não fornecido" });
      return;
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await auth.verifyIdToken(token);

    // Buscar tenant do usuário
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) {
      res.status(403).json({ success: false, error: "Usuário não cadastrado" });
      return;
    }

    const userData = userDoc.data();
    if (!userData?.tenantId) {
      res.status(403).json({ success: false, error: "Usuário sem tenant vinculado" });
      return;
    }

    (req as AuthRequest).user = {
      uid: decoded.uid,
      email: decoded.email || "",
      tenantId: userData.tenantId,
    };

    next();
  } catch (error) {
    logger.error("Erro na autenticação", {}, error);
    res.status(401).json({ success: false, error: "Token inválido" });
  }
}
