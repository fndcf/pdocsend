import { useState, useEffect, useCallback } from "react";
import apiClient from "@/services/apiClient";

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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [monitoramento, setMonitoramento] = useState<MonitoramentoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Carregar contagem de pendentes ao abrir
  useEffect(() => {
    apiClient.get<Pendente[]>("/admin/pendentes").then(setPendentes).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "clientes") {
        const data = await apiClient.get<Cliente[]>("/admin/clientes");
        setClientes(data);
      } else if (tab === "pendentes") {
        const data = await apiClient.get<Pendente[]>("/admin/pendentes");
        setPendentes(data);
      } else {
        const data = await apiClient.get<MonitoramentoItem[]>("/admin/monitoramento");
        setMonitoramento(data);
      }
    } catch {
      setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { clientes, pendentes, monitoramento, loading, error, reload: loadData };
}

export type { Cliente, Pendente, MonitoramentoItem, Tab };
