export interface ZApiConfig {
  instanceId: string;
  token: string;
  clientToken: string;
  baseUrl: string;
}

export function getZApiConfig(instanceId: string, token: string, clientToken: string): ZApiConfig {
  return {
    instanceId,
    token,
    clientToken,
    baseUrl: `https://api.z-api.io/instances/${instanceId}/token/${token}`,
  };
}
