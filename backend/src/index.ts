import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { onRequest } from "firebase-functions/v2/https";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import logger from "./utils/logger";

const app = express();

// Segurança
app.use(helmet());

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Não permitido pelo CORS"));
      }
    },
    credentials: true,
  })
);

// Rate limiting
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 requests por minuto por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Muitas requisições. Tente novamente em instantes." },
  })
);

// Rate limiting mais restritivo para upload de PDF
app.use(
  "/api/pdf",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10, // 10 uploads por minuto
    message: { success: false, error: "Muitos uploads. Aguarde um momento." },
  })
);

// Parse JSON (exceto multipart)
app.use((req, res, next) => {
  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Health check (fora do /api para acesso direto ao Cloud Function)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rotas da API
app.use("/api", routes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Rota não encontrada" });
});

// Error handler global
app.use(errorHandler);

// Firebase Function
export const api = onRequest(
  {
    timeoutSeconds: 60,
    memory: "512MiB",
    region: "southamerica-east1",
  },
  app
);

// Cloud Function para processamento de envio individual (acionada pelo Cloud Tasks)
export { processarEnvio } from "./functions/processarEnvio";

// Servidor local (apenas quando rodado via ts-node-dev)
if (process.env.LOCAL_DEV === "true") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT}`);
  });
}

export default app;
