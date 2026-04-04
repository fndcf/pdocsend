import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  Send,
  Trash2,
  CheckCircle,
  Clock,
  Eye,
  Pencil,
  Check,
  X,
  History,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { ContatoComStatus } from "@/types";
import {
  ErrorAlert,
  PageHeader,
  BackButton,
  Modal,
  ModalTitle,
  ModalText,
  ModalActions,
  ModalCancelButton,
  ModalConfirmButton,
  EmptyState,
} from "@/components/ui";

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

function getRevisaoState(locationState: unknown): LocationState | null {
  if (locationState) return locationState as LocationState;
  try {
    const saved = sessionStorage.getItem("revisaoData");
    if (saved) return JSON.parse(saved) as LocationState;
  } catch { /* ignore */ }
  return null;
}

export function Revisao() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = getRevisaoState(location.state);

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
          <BackButton onClick={() => navigate("/")}>Voltar</BackButton>
        </EmptyState>
      </Container>
    );
  }

  const novos = contatos.filter((c) => c.status === "novo");
  const jaEnviados = contatos.filter((c) => c.status === "ja_enviado");

  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleStartEdit = useCallback((index: number, nome: string) => {
    setEditingIndex(index);
    setEditingName(nome);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingIndex !== null && editingName.trim()) {
      setContatos((prev) =>
        prev.map((c, i) =>
          i === editingIndex ? { ...c, nome: editingName.trim() } : c
        )
      );
      setEditingIndex(null);
    }
  }, [editingIndex, editingName]);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingName("");
  }, []);

  const handleRemover = useCallback((index: number) => {
    setConfirmRemoveIndex(index);
  }, []);

  const confirmarRemocao = useCallback(() => {
    if (confirmRemoveIndex !== null) {
      setContatos((prev) => prev.filter((_, i) => i !== confirmRemoveIndex));
      setConfirmRemoveIndex(null);
    }
  }, [confirmRemoveIndex]);

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

      sessionStorage.removeItem("revisaoData");
      navigate(`/envio/${resultado.loteId}`);
    } catch (err: unknown) {
      let message = "Erro ao confirmar envio";
      const axiosErr = err as { response?: { data?: { error?: string } } };
      if (axiosErr.response?.data?.error) {
        message = axiosErr.response.data.error;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <PageHeader
        title={`Revisão - ${state.pdfOrigem}`}
        onBack={() => navigate("/")}
      />

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
                <CardHeader>
                  <CardLeft>
                    {editingIndex === index ? (
                      <EditNameRow>
                        <EditNameInput
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          autoFocus
                        />
                        <EditNameButton onClick={handleSaveEdit} title="Salvar">
                          <Check size={14} />
                        </EditNameButton>
                        <EditNameButton onClick={handleCancelEdit} title="Cancelar" $cancel>
                          <X size={14} />
                        </EditNameButton>
                      </EditNameRow>
                    ) : (
                      <ContatoNomeRow>
                        <ContatoNome>{contato.nome}</ContatoNome>
                        <EditNameButton
                          onClick={() => handleStartEdit(index, contato.nome)}
                          title="Editar nome"
                        >
                          <Pencil size={12} />
                        </EditNameButton>
                      </ContatoNomeRow>
                    )}
                    <TelefoneRow>
                      <ContatoTelefone>{contato.telefone}</ContatoTelefone>
                      <HistoricoLink
                        onClick={() =>
                          navigate(`/historico/contato?telefone=${contato.telefone}`)
                        }
                        title="Ver histórico deste contato"
                      >
                        <History size={12} />
                      </HistoricoLink>
                    </TelefoneRow>
                  </CardLeft>
                  {editingIndex !== index && (
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
                  )}
                </CardHeader>
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
                {previewIndex === index && contato.mensagemPreview && (
                  <PreviewBox>
                    <PreviewTextarea
                      value={contato.mensagemPreview}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setContatos((prev) =>
                          prev.map((c, i) =>
                            i === index
                              ? { ...c, mensagemPreview: newValue }
                              : c
                          )
                        );
                      }}
                      rows={6}
                    />
                  </PreviewBox>
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
                <CardHeader>
                  <CardLeft>
                    <ContatoNome>{contato.nome}</ContatoNome>
                    <ContatoTelefone>{contato.telefone}</ContatoTelefone>
                  </CardLeft>
                </CardHeader>
              </ContatoCard>
            );
          })}
        </Section>
      )}

      {error && <StyledErrorAlert message={error} />}

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

      {confirmRemoveIndex !== null && (
        <Modal onClose={() => setConfirmRemoveIndex(null)}>
          <ModalTitle>Remover contato</ModalTitle>
          <ModalText>
            Tem certeza que deseja remover{" "}
            <strong>{contatos[confirmRemoveIndex]?.nome}</strong> da lista de
            envio?
          </ModalText>
          <ModalActions>
            <ModalCancelButton onClick={() => setConfirmRemoveIndex(null)}>
              Cancelar
            </ModalCancelButton>
            <ModalConfirmButton onClick={confirmarRemocao}>
              <Trash2 size={16} />
              Remover
            </ModalConfirmButton>
          </ModalActions>
        </Modal>
      )}
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  padding-bottom: 5rem;
`;

const StyledErrorAlert = styled(ErrorAlert)`
  max-width: 800px;
  margin: 1rem auto;
  padding: 0.75rem 1rem;
`;

const Resumo = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;

  @media (min-width: 640px) {
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    padding: 1.5rem 2rem;
  }
`;

const ResumoItem = styled.div`
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  @media (min-width: 640px) {
    padding: 1rem;
  }
`;

const ResumoNumber = styled.div<{ $color?: string }>`
  font-size: 1.25rem;
  font-weight: 800;

  @media (min-width: 640px) {
    font-size: 1.75rem;
  }
  color: ${(p) =>
    p.$color === "green"
      ? "#16a34a"
      : p.$color === "gray"
        ? "#9ca3af"
        : p.theme.colors.text};
`;

const ResumoLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 0.25rem;

  @media (min-width: 640px) {
    font-size: ${({ theme }) => theme.fontSize.sm};
  }
`;

const Section = styled.section`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem;

  @media (min-width: 640px) {
    padding: 0 2rem;
  }
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
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};

  @media (min-width: 640px) {
    padding: 1rem;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

const ContatoNomeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const ContatoNome = styled.div`
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.md};
`;

const EditNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const EditNameInput = styled.input`
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.md};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  padding: 0.125rem 0.375rem;
  outline: none;
  width: 200px;
`;

const EditNameButton = styled.button<{ $cancel?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.25rem;
  background: none;
  border: none;
  color: ${(p) => p.$cancel ? p.theme.colors.error : p.theme.colors.textSecondary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
    color: ${(p) => p.$cancel ? p.theme.colors.error : p.theme.colors.primary};
  }
`;

const TelefoneRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.125rem;
`;

const ContatoTelefone = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const HistoricoLink = styled.button`
  display: flex;
  align-items: center;
  padding: 0.125rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  opacity: 0.6;

  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ImoveisList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.625rem;
  padding-top: 0.625rem;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
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
`;

const PreviewTextarea = styled.textarea`
  width: 100%;
  border: none;
  background: transparent;
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  color: ${({ theme }) => theme.colors.text};
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

