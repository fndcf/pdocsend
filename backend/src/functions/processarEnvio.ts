/**
 * Cloud Function acionada pelo Cloud Tasks para enviar uma mensagem individual
 */

import { onRequest } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import zApiService from "../services/ZApiService";
import messageBuilderService from "../services/MessageBuilderService";
import deduplicacaoService from "../services/DeduplicacaoService";
import logger from "../utils/logger";
import { Contato } from "../models/Imovel";

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
    const payload = req.body as EnvioPayload;
    const { tenantId, loteId, envioId } = payload;

    const envioRef = db.doc(
      `tenants/${tenantId}/lotes/${loteId}/envios/${envioId}`
    );
    const loteRef = db.doc(`tenants/${tenantId}/lotes/${loteId}`);

    try {
      // 1. Buscar dados do envio
      const envioDoc = await envioRef.get();
      if (!envioDoc.exists) {
        logger.error("Envio não encontrado", { tenantId, loteId, envioId });
        res.status(404).json({ error: "Envio não encontrado" });
        return;
      }

      const envioData = envioDoc.data()!;

      // Já foi processado? (idempotência)
      if (envioData.status === "enviado" || envioData.status === "erro") {
        res.status(200).json({ status: "already_processed" });
        return;
      }

      // 2. Marcar como enviando
      await envioRef.update({ status: "enviando" });

      // 3. Buscar template do tenant
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      const tenantData = tenantDoc.data();

      if (!tenantData?.zapiInstanceId || !tenantData?.zapiToken || !tenantData?.zapiClientToken) {
        throw new Error("Z-API não configurada para este tenant");
      }

      // 4. Montar mensagem com saudação dinâmica
      const contato: Contato = {
        nome: envioData.nome,
        telefone: envioData.telefone,
        imoveis: envioData.imoveis,
      };

      const mensagem = messageBuilderService.montarMensagem(
        contato,
        tenantData.mensagemTemplate
      );

      // 5. Enviar via Z-API
      await zApiService.enviarMensagem(
        tenantData.zapiInstanceId,
        tenantData.zapiToken,
        tenantData.zapiClientToken,
        envioData.telefone,
        mensagem
      );

      // 6. Atualizar status para enviado
      await envioRef.update({
        status: "enviado",
        mensagem,
        enviadoEm: Timestamp.now(),
      });

      // 7. Incrementar contador do lote
      await loteRef.update({
        enviados: FieldValue.increment(1),
      });

      // 8. Registrar imóveis como enviados (deduplicação)
      await deduplicacaoService.registrarEnviados(
        tenantId,
        envioData.telefone,
        envioData.imoveis,
        loteId,
        envioId
      );

      // 9. Verificar se lote finalizou
      await verificarFinalizacao(loteRef);

      logger.info("Envio processado com sucesso", {
        tenantId,
        loteId,
        envioId,
        telefone: envioData.telefone,
      });

      res.status(200).json({ status: "sent" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";

      logger.error(
        "Erro ao processar envio",
        { tenantId, loteId, envioId },
        error
      );

      // Atualizar status para erro
      await envioRef.update({
        status: "erro",
        erro: errorMessage,
      });

      // Incrementar contador de erros
      await loteRef.update({
        erros: FieldValue.increment(1),
      });

      await verificarFinalizacao(loteRef);

      res.status(200).json({ status: "error", error: errorMessage });
    }
  }
);

/**
 * Verifica se todos os envios do lote foram processados e finaliza
 */
async function verificarFinalizacao(
  loteRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  const loteDoc = await loteRef.get();
  const lote = loteDoc.data();
  if (!lote) return;

  const processados = (lote.enviados || 0) + (lote.erros || 0);
  if (processados >= lote.totalEnvios) {
    await loteRef.update({
      status: "finalizado",
      finalizadoEm: Timestamp.now(),
    });
  }
}
