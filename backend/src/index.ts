import express from "express";
import cors from "cors";
import helmet from "helmet";
import { onRequest } from "firebase-functions/v2/https";
import { beforeUserCreated } from "firebase-functions/v2/identity";
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

// Parse JSON (exceto multipart)
app.use((req, res, next) => {
  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Health check
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

// Desativar usuário recém-criado (auto-registro com aprovação manual)
export const beforeCreate = beforeUserCreated(async (event) => {
  const { auth: adminAuth } = await import("./config/firebase");
  const user = event.data;
  if (!user) return;

  logger.info("Novo usuário registrado, desativando conta", {
    uid: user.uid,
    email: user.email || "",
  });

  // Desativa o usuário para aprovação manual
  await adminAuth.updateUser(user.uid, { disabled: true });
});

// Cloud Function para processamento de envio individual (acionada pelo Cloud Tasks)
export { processarEnvio } from "./functions/processarEnvio";

// Servidor local (desenvolvimento)
if (process.env.NODE_ENV !== "production" && !process.env.K_SERVICE) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT}`);
  });
}

export default app;
