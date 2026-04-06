import rateLimit from "express-rate-limit";
import { AuthRequest } from "./auth";

/**
 * Rate limiting por usuário autenticado.
 * Usa uid como chave em vez de IP, protege contra abuso de um usuário específico.
 * Deve ser usado APÓS o middleware requireAuth.
 */
const userRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto por usuário
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?.uid || req.ip || "unknown";
  },
  message: { success: false, error: "Muitas requisições do seu usuário. Aguarde um momento." },
});

export default userRateLimit;
