/**
 * Service para criação de tasks no Cloud Tasks para envio assíncrono
 */

import { CloudTasksClient } from "@google-cloud/tasks";
import { CLOUD_TASKS_CONFIG } from "../config/cloudTasks";
import logger from "../utils/logger";

interface EnvioPayload {
  tenantId: string;
  loteId: string;
  envioId: string;
}

class FilaEnvioService {
  private client: CloudTasksClient | null = null;

  private getClient(): CloudTasksClient {
    if (!this.client) {
      this.client = new CloudTasksClient();
    }
    return this.client;
  }

  /**
   * Cria tasks no Cloud Tasks para cada envio, com delay incremental
   */
  async criarTasks(
    payloads: EnvioPayload[],
    functionUrl: string
  ): Promise<void> {
    const client = this.getClient();
    const { project, location, queue, delayBetweenMessages } =
      CLOUD_TASKS_CONFIG;

    const parent = client.queuePath(project, location, queue);

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      const delaySeconds = i * delayBetweenMessages;

      const scheduleTime = new Date();
      scheduleTime.setSeconds(scheduleTime.getSeconds() + delaySeconds);

      const serviceAccountEmail = `${project}@appspot.gserviceaccount.com`;

      await client.createTask({
        parent,
        task: {
          httpRequest: {
            httpMethod: "POST",
            url: functionUrl,
            headers: { "Content-Type": "application/json" },
            body: Buffer.from(JSON.stringify(payload)).toString("base64"),
            oidcToken: {
              serviceAccountEmail,
              audience: functionUrl,
            },
          },
          scheduleTime: {
            seconds: Math.floor(scheduleTime.getTime() / 1000),
          },
        },
      });
    }

    logger.info("Tasks criadas no Cloud Tasks", {
      total: payloads.length,
      delayTotal: `${payloads.length * delayBetweenMessages}s`,
    });
  }
}

export default new FilaEnvioService();
