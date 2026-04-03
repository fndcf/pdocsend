import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Upload as UploadIcon, FileText, AlertCircle, LogOut, History } from "lucide-react";
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

export function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { logout } = useAuth();
  const { loading: tenantLoading, error: tenantError, isSuperAdmin } = useTenant();
  const navigate = useNavigate();

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
        file
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
        <Content>
          <Title>Processar PDF</Title>
          <Description>
            Faça upload de um PDF com dados de imóveis para extrair contatos e
            enviar mensagens via WhatsApp.
          </Description>

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
