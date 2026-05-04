/**
 * Service que contém toda a lógica de processamento de um envio individual.
 * Extraído da Cloud Function processarEnvio para melhor testabilidade e SRP.
 */

import zApiService from "./ZApiService";
import messageBuilderService from "./MessageBuilderService";
import deduplicacaoService from "./DeduplicacaoService";
import logger from "../utils/logger";
import { Contato } from "../models/Imovel";
import { Tenant } from "../models/Tenant";
import tenantRepository from "../repositories/TenantRepository";
import loteRepository from "../repositories/LoteRepository";
import envioRepository from "../repositories/EnvioRepository";
import MemoryCache from "../utils/cache";
import { decrypt } from "../utils/crypto";

export type ProcessarResult =
  | { status: "sent" }
  | { status: "already_processed" }
  | { status: "cancelled" }
  | { status: "not_found" }
  | { status: "error"; error: string };

// Cache de tenant config com TTL de 10 minutos.
// Config de tenant muda raramente e é a mesma para todas as tasks de um lote.
const tenantCache = new MemoryCache<Tenant & { id: string }>(10 * 60);

class EnvioProcessorService {
  /**
   * Processa um envio individual: verifica estado, monta mensagem, envia via Z-API.
   * Retorna o resultado sem lançar exceção — erros são tratados internamente.
   */
  async processar(tenantId: string, loteId: string, envioId: string): Promise<ProcessarResult> {
    try {
      // 1. Buscar dados do envio
      const envioData = await envioRepository.buscarPorId(tenantId, loteId, envioId);
      if (!envioData) {
        logger.error("Envio não encontrado", { tenantId, loteId, envioId });
        return { status: "not_found" };
      }

      // 2. Idempotência — já foi processado?
      if (envioData.status === "enviado" || envioData.status === "erro" || envioData.status === "cancelado") {
        return { status: "already_processed" };
      }

      // 3. Lote foi cancelado?
      const loteData = await loteRepository.buscarPorId(tenantId, loteId);
      if (loteData?.status === "cancelado") {
        await envioRepository.atualizarStatus(tenantId, loteId, envioId, "cancelado");
        await this.verificarFinalizacao(tenantId, loteId);
        logger.info("Envio pulado - lote cancelado", { tenantId, loteId, envioId });
        return { status: "cancelled" };
      }

      // 4. Marcar como enviando
      await envioRepository.atualizarStatus(tenantId, loteId, envioId, "enviando");

      // 5. Buscar config do tenant (com cache)
      const tenant = await this.buscarTenantComCache(tenantId);
      if (!tenant?.zapiInstanceId || !tenant?.zapiToken || !tenant?.zapiClientToken) {
        throw new Error("Z-API não configurada para este tenant");
      }

      // 6. Montar mensagem
      const contato: Contato = {
        nome: envioData.nome,
        telefone: envioData.telefone,
        imoveis: envioData.imoveis,
      };

      const mensagem = envioData.mensagem
        ? messageBuilderService.aplicarSaudacao(envioData.mensagem)
        : messageBuilderService.montarMensagem(contato, tenant.mensagemTemplate);

      // 7. Verificar conexão e enviar via Z-API
      const conectado = await zApiService.verificarConexao(
        tenant.zapiInstanceId,
        decrypt(tenant.zapiToken),
        decrypt(tenant.zapiClientToken)
      );
      if (!conectado) {
        throw new Error("Z-API desconectada. Reconecte o WhatsApp e tente novamente.");
      }

      await zApiService.enviarMensagem(
        tenant.zapiInstanceId,
        decrypt(tenant.zapiToken),
        decrypt(tenant.zapiClientToken),
        contato.telefone,
        mensagem
      );

      // 8. Atualizar status
      await envioRepository.marcarEnviado(tenantId, loteId, envioId, mensagem);

      // 9. Registrar deduplicação
      await deduplicacaoService.registrarEnviados(
        tenantId,
        contato.telefone,
        contato.imoveis,
        loteId,
        envioId
      );

      // 10. Verificar se lote finalizou
      await this.verificarFinalizacao(tenantId, loteId);

      logger.info("Envio processado com sucesso", {
        tenantId,
        loteId,
        envioId,
        telefone: contato.telefone,
      });

      return { status: "sent" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

      logger.error("Erro ao processar envio", { tenantId, loteId, envioId }, error);

      await envioRepository.marcarErro(tenantId, loteId, envioId, errorMessage);
      await this.verificarFinalizacao(tenantId, loteId);

      return { status: "error", error: errorMessage };
    }
  }

  /**
   * Busca tenant com cache em memória (TTL 10min).
   */
  private async buscarTenantComCache(tenantId: string): Promise<(Tenant & { id: string }) | undefined> {
    let tenant = tenantCache.get(tenantId);
    if (!tenant) {
      const fetched = await tenantRepository.buscarPorId(tenantId);
      if (fetched) {
        tenantCache.set(tenantId, fetched);
        tenant = fetched;
      }
    }
    return tenant;
  }

  /**
   * Verifica se todos os envios do lote foram processados e finaliza.
   */
  private async verificarFinalizacao(tenantId: string, loteId: string): Promise<void> {
    const lote = await loteRepository.buscarPorId(tenantId, loteId);
    if (!lote) return;

    const contadores = await envioRepository.contarPorStatus(tenantId, loteId);

    await loteRepository.atualizarContadores(tenantId, loteId, {
      enviados: contadores.enviados,
      erros: contadores.erros,
    });

    const processados = contadores.enviados + contadores.erros + contadores.cancelados;
    if (processados >= lote.totalEnvios) {
      await loteRepository.finalizar(tenantId, loteId, contadores);
    }
  }
}

export default new EnvioProcessorService();
