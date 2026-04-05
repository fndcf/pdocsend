import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import apiClient from "@/services/apiClient";
import { queryKeys } from "@/types";

interface Cliente {
  id: string;
  nome: string;
  mensagemTemplate: { nomeCorretor: string; nomeEmpresa: string; cargo: string };
  zapiInstanceId: string;
  limiteDiario: number;
  usuarios: Array<{ uid: string; email: string; nome: string }>;
  criadoEm: unknown;
}

interface Pendente {
  uid: string;
  email: string;
  criadoEm: string;
}

interface MonitoramentoItem {
  tenantId: string;
  nome: string;
  corretor: string;
  totalEnviados: number;
  totalErros: number;
  lotesRecentes: Array<{
    id: string;
    pdfOrigem: string;
    totalEnvios: number;
    enviados: number;
    erros: number;
    status: string;
  }>;
}

type Tab = "clientes" | "pendentes" | "monitoramento";

export function useAdminData(tab: Tab) {
  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading: loadingClientes, error: errorClientes } = useQuery({
    queryKey: queryKeys.admin.clientes,
    queryFn: () => apiClient.get<Cliente[]>("/admin/clientes"),
    enabled: tab === "clientes",
  });

  const { data: pendentes = [], isLoading: loadingPendentes, error: errorPendentes } = useQuery({
    queryKey: queryKeys.admin.pendentes,
    queryFn: () => apiClient.get<Pendente[]>("/admin/pendentes"),
    // Sempre buscar pendentes (para o badge de contagem)
  });

  const { data: monitoramento = [], isLoading: loadingMonitoramento, error: errorMonitoramento } = useQuery({
    queryKey: queryKeys.admin.monitoramento,
    queryFn: () => apiClient.get<MonitoramentoItem[]>("/admin/monitoramento"),
    enabled: tab === "monitoramento",
  });

  const loading =
    (tab === "clientes" && loadingClientes) ||
    (tab === "pendentes" && loadingPendentes) ||
    (tab === "monitoramento" && loadingMonitoramento);

  const errorObj = tab === "clientes" ? errorClientes : tab === "pendentes" ? errorPendentes : errorMonitoramento;
  const error = errorObj ? "Erro ao carregar dados" : "";

  const reload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  }, [queryClient]);

  return { clientes, pendentes, monitoramento, loading, error, reload };
}

export type { Cliente, Pendente, MonitoramentoItem, Tab };
