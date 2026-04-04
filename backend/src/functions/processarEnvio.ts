/**
 * Cloud Function acionada pelo Cloud Tasks para enviar uma mensagem individual
 */

import { onRequest } from "firebase-functions/v2/https";
import zApiService from "../services/ZApiService";
import messageBuilderService from "../services/MessageBuilderService";
import deduplicacaoService from "../services/DeduplicacaoService";
import logger from "../utils/logger";
import { Contato } from "../models/Imovel";
import tenantRepository from "../repositories/TenantRepository";
import loteRepository from "../repositories/LoteRepository";
import envioRepository from "../repositories/EnvioRepository";

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

    try {
      // 1. Buscar dados do envio
      const envioData = await envioRepository.buscarPorId(tenantId, loteId, envioId);
      if (!envioData) {
        logger.error("Envio não encontrado", { tenantId, loteId, envioId });
        res.status(404).json({ error: "Envio não encontrado" });
        return;
      }

      // Já foi processado? (idempotência)
      const status = (envioData as Record<string, unknown>).status as string;
      if (status === "enviado" || status === "erro" || status === "cancelado") {
        res.status(200).json({ status: "already_processed" });
        return;
      }

      // Verificar se o lote foi cancelado
      const loteData = await loteRepository.buscarPorId(tenantId, loteId);
      if ((loteData as Record<string, unknown>)?.status === "cancelado") {
        await envioRepository.atualizarStatus(tenantId, loteId, envioId, "cancelado");
        await verificarFinalizacao(tenantId, loteId);
        logger.info("Envio pulado - lote cancelado", { tenantId, loteId, envioId });
        res.status(200).json({ status: "cancelled" });
        return;
      }

      // Verificar se este envio individual foi cancelado
      if (status === "cancelado") {
        res.status(200).json({ status: "cancelled" });
        return;
      }

      // 2. Marcar como enviando
      await envioRepository.atualizarStatus(tenantId, loteId, envioId, "enviando");

      // 3. Buscar template do tenant
      const tenant = await tenantRepository.buscarPorId(tenantId);

      if (!tenant?.zapiInstanceId || !tenant?.zapiToken || !tenant?.zapiClientToken) {
        throw new Error("Z-API não configurada para este tenant");
      }

      // 4. Montar mensagem com saudação dinâmica
      const data = envioData as Record<string, unknown>;
      const contato: Contato = {
        nome: data.nome as string,
        telefone: data.telefone as string,
        imoveis: data.imoveis as Contato["imoveis"],
      };

      // Se já tem mensagem editada pelo corretor, substituir {saudação}
      // Caso contrário, gerar do zero
      const mensagemSalva = data.mensagem as string;
      const mensagem = mensagemSalva
        ? messageBuilderService.aplicarSaudacao(mensagemSalva)
        : messageBuilderService.montarMensagem(contato, tenant.mensagemTemplate);

      // 5. Enviar via Z-API
      await zApiService.enviarMensagem(
        tenant.zapiInstanceId,
        tenant.zapiToken,
        tenant.zapiClientToken,
        contato.telefone,
        mensagem
      );

      // 6. Atualizar status para enviado
      await envioRepository.marcarEnviado(tenantId, loteId, envioId, mensagem);

      // 7. Registrar imóveis como enviados (deduplicação)
      await deduplicacaoService.registrarEnviados(
        tenantId,
        contato.telefone,
        contato.imoveis,
        loteId,
        envioId
      );

      // 8. Verificar se lote finalizou
      await verificarFinalizacao(tenantId, loteId);

      logger.info("Envio processado com sucesso", {
        tenantId,
        loteId,
        envioId,
        telefone: contato.telefone,
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
      await envioRepository.marcarErro(tenantId, loteId, envioId, errorMessage);
      await verificarFinalizacao(tenantId, loteId);

      res.status(200).json({ status: "error", error: errorMessage });
    }
  }
);

/**
 * Verifica se todos os envios do lote foram processados e finaliza
 */
async function verificarFinalizacao(tenantId: string, loteId: string): Promise<void> {
  const lote = await loteRepository.buscarPorId(tenantId, loteId);
  if (!lote) return;

  const contadores = await envioRepository.contarPorStatus(tenantId, loteId);

  await loteRepository.atualizarContadores(tenantId, loteId, {
    enviados: contadores.enviados,
    erros: contadores.erros,
  });

  const processados = contadores.enviados + contadores.erros + contadores.cancelados;
  if (processados >= ((lote as Record<string, unknown>).totalEnvios as number)) {
    await loteRepository.finalizar(tenantId, loteId, contadores);
  }
}
