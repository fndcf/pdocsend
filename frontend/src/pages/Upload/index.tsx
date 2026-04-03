import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Upload as UploadIcon, FileText, AlertCircle, LogOut, History, Send, Calendar, FileBarChart, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { TenantGuard } from "@/components/TenantGuard";
import apiClient from "@/services/apiClient";
import { ContatoComStatus } from "@/types";

interface ProcessarResponse {
  contatos: ContatoComStatus[];
  resumo: {
    totalExtraidos: number;
    totalContatos: number;
    novos: number;
    jaEnviados: number;
  };
  pdfOrigem: string;
}

interface DashboardData {
  enviadosHoje: number;
  limiteDiario: number;
  enviadosMes: number;
  errosMes: number;
  totalPdfs: number;
  ultimoEnvio: unknown;
}

export function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [filtroOperacao, setFiltroOperacao] = useState<"todos" | "venda" | "locacao">("todos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { logout } = useAuth();
  const { loading: tenantLoading, error: tenantError, isSuperAdmin } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get<DashboardData>("/envios/dashboard").then(setDashboard).catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Formato inválido. Envie um arquivo PDF.");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Formato inválido. Envie um arquivo PDF.");
      }
    }
  };

  const handleProcessar = async () => {
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const resultado = await apiClient.upload<ProcessarResponse>(
        "/pdf/processar",
        file,
        { filtroOperacao }
      );

      // Navegar para revisão com os dados
      navigate("/revisao", {
        state: resultado,
      });
    } catch (err: unknown) {
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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingOverlay>
          <LoadingContent>
            <UploadIcon size={48} color="#2563eb" className="spin" />
            <LoadingTitle>Processando PDF...</LoadingTitle>
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
          <Title>Processar PDF</Title>
          <Description>
            Faça upload de um PDF com dados de imóveis para extrair contatos e
            enviar mensagens via WhatsApp.
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
              accept=".pdf"
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
                <DropText>Arraste o PDF aqui ou clique para selecionar</DropText>
                <DropSubtext>Apenas arquivos PDF (máx. 10MB)</DropSubtext>
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
            {loading ? "Processando..." : "Processar PDF"}
          </Button>
        </Content>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;

  .spin {
    animation: spin 2s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
`;

const LoadingTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.xl};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const LoadingText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  line-height: 1.5;
`;

const DashboardCards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  max-width: 600px;
  margin: 1rem auto;
  padding: 0 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, 1fr);
    padding: 0 1.5rem;
    margin: 1.5rem auto;
  }
`;

const DashCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: 0.75rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 640px) {
    padding: 1rem;
  }
`;

const DashIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: 0.5rem;
  color: ${(p) =>
    p.$color === "blue" ? "#2563eb" :
    p.$color === "green" ? "#16a34a" :
    p.$color === "purple" ? "#7c3aed" : "#6b7280"};
  background: ${(p) =>
    p.$color === "blue" ? "#eff6ff" :
    p.$color === "green" ? "#f0fdf4" :
    p.$color === "purple" ? "#f5f3ff" : "#f9fafb"};
`;

const DashInfo = styled.div``;

const DashValue = styled.div<{ $small?: boolean }>`
  font-size: ${(p) => p.$small ? p.theme.fontSize.sm : "1.25rem"};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const DashLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 0.125rem;
`;

const DashProgress = styled.div`
  height: 4px;
  background: ${({ theme }) => theme.colors.borderLight};
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
`;

const DashProgressBar = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${(p) => p.$percent}%;
  background: ${(p) => p.$percent > 80 ? "#f59e0b" : p.$percent > 95 ? "#dc2626" : "#2563eb"};
  border-radius: 2px;
  transition: width 0.3s;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 640px) {
    padding: 1rem 2rem;
  }
`;

const Logo = styled.h1`
  font-size: 1.25rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const HeaderButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: 500;
  transition: all 0.2s;

  @media (min-width: 640px) {
    padding: 0.5rem 0.75rem;
    font-size: ${({ theme }) => theme.fontSize.sm};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const FilterGroup = styled.div`
  margin-bottom: 1rem;
`;

const FilterLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.5rem;
`;

const FilterOptions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const FilterOption = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${(p) => p.$active ? p.theme.colors.primary : p.theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${(p) => p.$active ? p.theme.colors.primary : "white"};
  color: ${(p) => p.$active ? "white" : p.theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Content = styled.main`
  max-width: 600px;
  margin: 1.5rem auto;
  padding: 0 1rem;

  @media (min-width: 640px) {
    margin: 3rem auto;
    padding: 0 1.5rem;
  }
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.xxl};
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.md};
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const DropZone = styled.div<{ $hasFile: boolean }>`
  border: 2px dashed ${(p) => (p.$hasFile ? "#16a34a" : p.theme.colors.border)};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(p) => (p.$hasFile ? "#f0fdf4" : p.theme.colors.surface)};

  &:hover {
    border-color: ${(p) => (p.$hasFile ? "#16a34a" : p.theme.colors.primary)};
  }
`;

const DropContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`;

const DropText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const DropSubtext = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
`;

const FileName = styled.span`
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.md};
`;

const FileSize = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: #991b1b;
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const Button = styled.button`
  width: 100%;
  margin-top: 1.5rem;
  padding: 0.875rem;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 600;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
