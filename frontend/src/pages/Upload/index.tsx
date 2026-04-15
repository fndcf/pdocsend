import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Upload as UploadIcon, FileText, AlertCircle, LogOut, History, Send, Calendar, FileBarChart, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { useDashboard } from "@/hooks/useDashboard";
import { useFileUpload } from "@/hooks/useFileUpload";
import { TenantGuard } from "@/components/TenantGuard";
import apiClient from "@/services/apiClient";
import { ContatoComStatus } from "@/types";
import {
  Container, UploadLoadingOverlay as LoadingOverlay, LoadingContent, LoadingTitle, LoadingText,
  DashboardCards, DashCard, DashIcon, DashInfo, DashValue, DashLabel, DashProgress, DashProgressBar,
  Header, Logo, HeaderActions, HeaderButton,
  FilterGroup, FilterLabel, FilterOptions, FilterOption,
  Content, Title, Description,
  DropZone, DropContent, DropText, DropSubtext, FileInfo, FileName, FileSize,
  ErrorBox, Button,
} from "./styles";

interface ProcessarResponse {
  contatos: ContatoComStatus[];
  resumo: {
    totalExtraidos: number;
    totalContatos: number;
    novos: number;
    jaEnviados: number;
    telefoneInvalido: number;
  };
  pdfOrigem: string;
}

export function Upload() {
  const [filtroOperacao, setFiltroOperacao] = useState<"todos" | "venda" | "locacao">("todos");
  const { file, fileInputRef, error, setError, handleFileChange, handleDrop } = useFileUpload();
  const dashboard = useDashboard();
  const { logout } = useAuth();
  const { loading: tenantLoading, error: tenantError, isSuperAdmin } = useTenant();
  const navigate = useNavigate();

  const processarMutation = useMutation({
    mutationFn: (uploadFile: File) =>
      apiClient.upload<ProcessarResponse>("/pdf/processar", uploadFile, { filtroOperacao }),
    onSuccess: (resultado) => {
      sessionStorage.setItem("revisaoData", JSON.stringify(resultado));
      navigate("/revisao", { state: resultado });
    },
    onError: (err: unknown) => {
      let message = "Erro ao processar PDF";
      if (err instanceof Error) {
        if (err.message.includes("500")) {
          message = "Erro interno do servidor. Tente novamente em alguns instantes.";
        } else if (err.message.includes("413") || err.message.includes("grande")) {
          message = "Arquivo muito grande. O tamanho máximo é 10MB.";
        } else if (err.message.includes("401") || err.message.includes("autorizado")) {
          message = "Sessão expirada. Faça login novamente.";
        } else if (err.message.includes("Network") || err.message.includes("network")) {
          message = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else {
          message = err.message;
        }
      }
      setError(message);
    },
  });

  const handleProcessar = () => {
    if (!file) return;
    setError("");
    processarMutation.mutate(file);
  };

  const loading = processarMutation.isPending;

  if (loading) {
    return (
      <Container>
        <LoadingOverlay>
          <LoadingContent>
            <UploadIcon size={48} color="#2563eb" className="spin" />
            <LoadingTitle>Processando arquivo...</LoadingTitle>
            <LoadingText>
              Extraindo dados de imóveis e preparando contatos.
              <br />
              Isso pode levar alguns segundos.
            </LoadingText>
          </LoadingContent>
        </LoadingOverlay>
      </Container>
    );
  }

  // Superadmin redireciona para painel admin
  if (!tenantLoading && isSuperAdmin) {
    navigate("/admin");
    return null;
  }

  if (tenantLoading || tenantError) {
    return (
      <Container>
        <TenantGuard loading={tenantLoading} error={tenantError}>
          <div />
        </TenantGuard>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Logo>PDocSend</Logo>
        <HeaderActions>
          <HeaderButton onClick={() => navigate("/historico")}>
            <History size={18} />
            Histórico
          </HeaderButton>
          <HeaderButton onClick={logout}>
            <LogOut size={18} />
            Sair
          </HeaderButton>
        </HeaderActions>
      </Header>

        {dashboard && (
          <DashboardCards>
            <DashCard>
              <DashIcon $color="blue"><Send size={18} /></DashIcon>
              <DashInfo>
                <DashValue>{dashboard.enviadosHoje} / {dashboard.limiteDiario}</DashValue>
                <DashLabel>Enviados hoje</DashLabel>
              </DashInfo>
              <DashProgress>
                <DashProgressBar $percent={Math.min(100, (dashboard.enviadosHoje / dashboard.limiteDiario) * 100)} />
              </DashProgress>
            </DashCard>
            <DashCard>
              <DashIcon $color="green"><Calendar size={18} /></DashIcon>
              <DashInfo>
                <DashValue>{dashboard.enviadosMes}</DashValue>
                <DashLabel>Enviados no mês</DashLabel>
              </DashInfo>
            </DashCard>
            <DashCard>
              <DashIcon $color="purple"><FileBarChart size={18} /></DashIcon>
              <DashInfo>
                <DashValue>{dashboard.totalPdfs}</DashValue>
                <DashLabel>PDFs processados</DashLabel>
              </DashInfo>
            </DashCard>
            <DashCard>
              <DashIcon $color="gray"><Clock size={18} /></DashIcon>
              <DashInfo>
                <DashValue $small>
                  {dashboard.ultimoEnvio
                    ? (() => {
                        const ts = dashboard.ultimoEnvio as Record<string, unknown>;
                        const secs = (ts.seconds || ts._seconds) as number | undefined;
                        if (secs) return new Date(secs * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                        const d = new Date(ts as unknown as string | number);
                        return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                      })()
                    : "—"}
                </DashValue>
                <DashLabel>Último envio</DashLabel>
              </DashInfo>
            </DashCard>
          </DashboardCards>
        )}

        <Content>
          <Title>Processar arquivo</Title>
          <Description>
            Faça upload de um PDF ou Excel (.xlsx) com dados de imóveis para
            extrair contatos e enviar mensagens via WhatsApp.
          </Description>

          <FilterGroup>
            <FilterLabel>Tipo de operação:</FilterLabel>
            <FilterOptions>
              <FilterOption $active={filtroOperacao === "todos"} onClick={() => setFiltroOperacao("todos")}>
                Todos
              </FilterOption>
              <FilterOption $active={filtroOperacao === "venda"} onClick={() => setFiltroOperacao("venda")}>
                Apenas Venda
              </FilterOption>
              <FilterOption $active={filtroOperacao === "locacao"} onClick={() => setFiltroOperacao("locacao")}>
                Apenas Locação
              </FilterOption>
            </FilterOptions>
          </FilterGroup>

          <DropZone
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            $hasFile={!!file}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {file ? (
              <FileInfo>
                <FileText size={32} color="#16a34a" />
                <FileName>{file.name}</FileName>
                <FileSize>({(file.size / 1024 / 1024).toFixed(2)} MB)</FileSize>
              </FileInfo>
            ) : (
              <DropContent>
                <UploadIcon size={40} color="#9ca3af" />
                <DropText>Arraste o arquivo aqui ou clique para selecionar</DropText>
                <DropSubtext>PDF ou Excel (.xlsx) — máx. 10MB</DropSubtext>
              </DropContent>
            )}
          </DropZone>

          {error && (
            <ErrorBox>
              <AlertCircle size={16} />
              {error}
            </ErrorBox>
          )}

          <Button onClick={handleProcessar} disabled={!file || loading}>
            {loading ? "Processando..." : "Processar arquivo"}
          </Button>
        </Content>
    </Container>
  );
}

