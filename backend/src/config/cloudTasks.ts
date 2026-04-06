const project = process.env.GCLOUD_PROJECT || process.env.FB_PROJECT_ID || "";

export const CLOUD_TASKS_CONFIG = {
  project,
  location: "southamerica-east1",
  queue: "envio-whatsapp",
  delayBetweenMessages: 50, // segundos entre cada mensagem
  processarEnvioUrl: `https://southamerica-east1-${project}.cloudfunctions.net/processarEnvio`,
};
