/**
 * Cloud Function acionada pelo Cloud Tasks para enviar uma mensagem individual.
 * Delega toda a lógica para EnvioProcessorService.
 */

import { onRequest } from "firebase-functions/v2/https";
import envioProcessorService from "../services/EnvioProcessorService";

interface EnvioPayload {
  tenantId: string;
  loteId: string;
  envioId: string;
}

export const processarEnvio = onRequest(
  {
    timeoutSeconds: 30,
    memory: "256MiB",
    region: "southamerica-east1",
  },
  async (req, res) => {
    const { tenantId, loteId, envioId } = req.body as EnvioPayload;
    const result = await envioProcessorService.processar(tenantId, loteId, envioId);

    const statusCode = result.status === "not_found" ? 404 : 200;
    res.status(statusCode).json(result);
  }
);
