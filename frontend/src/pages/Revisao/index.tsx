import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowLeft,
  Send,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { ContatoComStatus } from "@/types";

interface LocationState {
  contatos: ContatoComStatus[];
  resumo: {
    totalImoveisNoPdf: number;
    totalImoveis: number;
    totalContatos: number;
    novos: number;
    jaEnviados: number;
  };
  pdfOrigem: string;
}

export function Revisao() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [contatos, setContatos] = useState<ContatoComStatus[]>(
    state?.contatos || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (!state) {
    return (
      <Container>
        <EmptyState>
          <p>Nenhum dado para revisar. Faça upload de um PDF primeiro.</p>
          <BackButton onClick={() => navigate("/")}>
            <ArrowLeft size={18} />
            Voltar
          </BackButton>
        </EmptyState>
      </Container>
    );
  }

  const novos = contatos.filter((c) => c.status === "novo");
  const jaEnviados = contatos.filter((c) => c.status === "ja_enviado");

  const handleRemover = (index: number) => {
    setContatos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmarEnvio = async () => {
    if (novos.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const resultado = await apiClient.post<{ loteId: string }>(
        "/envios/confirmar",
        {
          contatos: novos,
          pdfOrigem: state.pdfOrigem,
        }
      );

      navigate(`/envio/${resultado.loteId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao confirmar envio";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Voltar
        </BackButton>
        <HeaderTitle>Revisão - {state.pdfOrigem}</HeaderTitle>
      </Header>

      <Resumo>
        <ResumoItem>
          <ResumoNumber>{state.resumo.totalImoveisNoPdf}</ResumoNumber>
          <ResumoLabel>Imóveis no PDF</ResumoLabel>
        </ResumoItem>
        <ResumoItem>
          <ResumoNumber>{state.resumo.totalImoveis}</ResumoNumber>
          <ResumoLabel>Imóveis únicos</ResumoLabel>
        </ResumoItem>
        <ResumoItem>
          <ResumoNumber>{state.resumo.totalContatos}</ResumoNumber>
          <ResumoLabel>Contatos</ResumoLabel>
        </ResumoItem>
        <ResumoItem>
          <ResumoNumber $color="green">{novos.length}</ResumoNumber>
          <ResumoLabel>Mensagens a enviar</ResumoLabel>
        </ResumoItem>
        <ResumoItem>
          <ResumoNumber $color="gray">{jaEnviados.length}</ResumoNumber>
          <ResumoLabel>Já enviados</ResumoLabel>
        </ResumoItem>
      </Resumo>

      {novos.length > 0 && (
        <Section>
          <SectionTitle>
            <CheckCircle size={18} color="#16a34a" />
            Novos ({novos.length})
          </SectionTitle>
          {contatos.map((contato, index) => {
            if (contato.status !== "novo") return null;
            return (
              <ContatoCard key={index}>
                <ContatoInfo>
                  <ContatoNome>{contato.nome}</ContatoNome>
                  <ContatoTelefone>{contato.telefone}</ContatoTelefone>
                  <ImoveisList>
                    {contato.imoveis.map((im, j) => (
                      <ImovelTag key={j}>
                        <OperacaoTag $op={im.operacao}>
                          {im.operacao === "venda"
                            ? "V"
                            : im.operacao === "locacao"
                              ? "L"
                              : "V+L"}
                        </OperacaoTag>
                        {im.edificio || `${im.endereco}, ${im.numero}`}
                        {im.apartamento ? ` Apt ${im.apartamento}` : ""}
                      </ImovelTag>
                    ))}
                  </ImoveisList>
                </ContatoInfo>
                <ContatoActions>
                  <ActionButton
                    onClick={() =>
                      setPreviewIndex(previewIndex === index ? null : index)
                    }
                    title="Ver mensagem"
                  >
                    <Eye size={16} />
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleRemover(index)}
                    $danger
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </ActionButton>
                </ContatoActions>
                {previewIndex === index && contato.mensagemPreview && (
                  <PreviewBox>{contato.mensagemPreview}</PreviewBox>
                )}
              </ContatoCard>
            );
          })}
        </Section>
      )}

      {jaEnviados.length > 0 && (
        <Section>
          <SectionTitle>
            <Clock size={18} color="#9ca3af" />
            Já enviados ({jaEnviados.length}) - ignorados
          </SectionTitle>
          {contatos.map((contato, index) => {
            if (contato.status !== "ja_enviado") return null;
            return (
              <ContatoCard key={index} $disabled>
                <ContatoInfo>
                  <ContatoNome>{contato.nome}</ContatoNome>
                  <ContatoTelefone>{contato.telefone}</ContatoTelefone>
                </ContatoInfo>
              </ContatoCard>
            );
          })}
        </Section>
      )}

      {error && (
        <ErrorBox>
          <AlertCircle size={16} />
          {error}
        </ErrorBox>
      )}

      <Footer>
        <ConfirmButton
          onClick={handleConfirmarEnvio}
          disabled={novos.length === 0 || loading}
        >
          <Send size={18} />
          {loading
            ? "Confirmando..."
            : `Confirmar envio de ${novos.length} mensagem(ns)`}
        </ConfirmButton>
      </Footer>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  padding-bottom: 5rem;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const HeaderTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: 700;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 500;

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 2rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Resumo = styled.div`
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const ResumoItem = styled.div`
  flex: 1;
  text-align: center;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const ResumoNumber = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${(p) =>
    p.$color === "green"
      ? "#16a34a"
      : p.$color === "gray"
        ? "#9ca3af"
        : p.theme.colors.text};
`;

const ResumoLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 0.25rem;
`;

const Section = styled.section`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
`;

const ContatoCard = styled.div<{ $disabled?: boolean }>`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};

  & > div:first-child {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
`;

const ContatoInfo = styled.div`
  flex: 1;
`;

const ContatoNome = styled.div`
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.md};
`;

const ContatoTelefone = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 0.125rem;
`;

const ImoveisList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
`;

const ImovelTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: ${({ theme }) => theme.colors.borderLight};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSize.xs};
`;

const OperacaoTag = styled.span<{ $op: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  font-size: 0.625rem;
  font-weight: 700;
  color: white;
  background: ${(p) =>
    p.$op === "venda"
      ? "#2563eb"
      : p.$op === "locacao"
        ? "#16a34a"
        : "#f59e0b"};
`;

const ContatoActions = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
  padding: 0.375rem;
  background: none;
  border: none;
  color: ${(p) =>
    p.$danger ? p.theme.colors.error : p.theme.colors.textSecondary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
  }
`;

const PreviewBox = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.sm};
  white-space: pre-line;
  line-height: 1.5;
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 800px;
  margin: 1rem auto;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: #991b1b;
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const Footer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem 2rem;
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: center;
`;

const ConfirmButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  background: ${({ theme }) => theme.colors.success};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 600;
  transition: opacity 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
