import { useQuery } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";

export interface DashboardData {
  enviadosHoje: number;
  limiteDiario: number;
  enviadosMes: number;
  errosMes: number;
  totalPdfs: number;
  ultimoEnvio: unknown;
}

export function useDashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiClient.get<DashboardData>("/envios/dashboard"),
  });

  return data ?? null;
}
