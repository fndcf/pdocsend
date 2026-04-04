import { useState, useEffect } from "react";
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
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    apiClient.get<DashboardData>("/envios/dashboard").then(setDashboard).catch(() => {});
  }, []);

  return dashboard;
}
