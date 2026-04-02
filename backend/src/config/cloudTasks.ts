export const CLOUD_TASKS_CONFIG = {
  project: process.env.GCLOUD_PROJECT || process.env.FB_PROJECT_ID || "",
  location: "southamerica-east1",
  queue: "envio-whatsapp",
  delayBetweenMessages: 50, // segundos entre cada mensagem
};
