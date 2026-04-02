/**
 * Service para integração com Z-API (envio de mensagens WhatsApp)
 */

import { getZApiConfig, ZApiConfig } from "../config/zapi";
import logger from "../utils/logger";

interface ZApiStatusResponse {
  connected: boolean;
  smartphoneConnected: boolean;
}

interface ZApiSendResponse {
  zapiMessageId: string;
  messageId: string;
}

class ZApiService {
  /**
   * Verifica se a instância Z-API está conectada
   */
  async verificarConexao(
    instanceId: string,
    token: string,
    clientToken: string
  ): Promise<boolean> {
    const config = getZApiConfig(instanceId, token, clientToken);

    try {
      const response = await this.request<ZApiStatusResponse>(
        config,
        "GET",
        "/status"
      );
      return response.connected && response.smartphoneConnected;
    } catch (error) {
      logger.error("Erro ao verificar conexão Z-API", {}, error);
      return false;
    }
  }

  /**
   * Envia mensagem de texto via WhatsApp
   */
  async enviarMensagem(
    instanceId: string,
    token: string,
    clientToken: string,
    telefone: string,
    mensagem: string
  ): Promise<ZApiSendResponse> {
    const config = getZApiConfig(instanceId, token, clientToken);

    const body = {
      phone: telefone,
      message: mensagem,
    };

    const response = await this.request<ZApiSendResponse>(
      config,
      "POST",
      "/send-text",
      body
    );

    logger.info("Mensagem enviada via Z-API", {
      telefone,
      zapiMessageId: response.zapiMessageId,
    });

    return response;
  }

  /**
   * Faz request para a Z-API
   */
  private async request<T>(
    config: ZApiConfig,
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${config.baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Client-Token": config.clientToken,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Z-API error ${response.status}: ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }
}

export default new ZApiService();
