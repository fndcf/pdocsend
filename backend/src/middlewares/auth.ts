import { Request, Response, NextFunction } from "express";
import { auth, db } from "../config/firebase";
import logger from "../utils/logger";
import MemoryCache from "../utils/cache";

export interface AuthRequest extends Request {
  user: {
    uid: string;
    email: string;
    tenantId: string;
    role: string;
  };
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}

interface UserCacheData {
  tenantId: string;
  role: string;
}

// Cache de user data com TTL de 5 minutos (role e tenantId mudam raramente)
const userCache = new MemoryCache<UserCacheData>(5 * 60);

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

    // Tentar buscar do cache primeiro
    let userData = userCache.get(decoded.uid);

    if (!userData) {
      // Cache miss - buscar do Firestore
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      if (!userDoc.exists) {
        res.status(403).json({ success: false, error: "Usuário não cadastrado" });
        return;
      }

      const docData = userDoc.data();
      userData = {
        tenantId: docData?.tenantId || "",
        role: docData?.role || "admin",
      };

      // Guardar no cache
      userCache.set(decoded.uid, userData);
    }

    // Superadmin pode acessar sem tenant
    if (userData.role !== "superadmin" && !userData.tenantId) {
      res.status(403).json({ success: false, error: "Usuário sem tenant vinculado" });
      return;
    }

    (req as AuthRequest).user = {
      uid: decoded.uid,
      email: decoded.email || "",
      tenantId: userData.tenantId,
      role: userData.role,
    };

    next();
  } catch (error) {
    logger.error("Erro na autenticação", {}, error);
    res.status(401).json({ success: false, error: "Token inválido" });
  }
}

/**
 * Invalida o cache de um usuário específico.
 * Chamar quando role ou tenantId mudar (ex: admin cria cliente).
 */
export function invalidateUserCache(uid: string): void {
  userCache.delete(uid);
}

/**
 * Limpa todo o cache de usuários.
 */
export function clearUserCache(): void {
  userCache.clear();
}
