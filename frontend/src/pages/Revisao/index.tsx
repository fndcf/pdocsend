import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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
  AlertTriangle,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { ContatoComStatus, queryKeys } from "@/types";
import {
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
import {
  Container, StyledErrorAlert, Resumo, ResumoItem, ResumoNumber, ResumoLabel,
  Section, SectionTitle, ContatoCard, CardHeader, CardLeft,
  ContatoNomeRow, ContatoNome, EditNameRow, EditNameInput, EditNameButton,
  TelefoneRow, ContatoTelefone, HistoricoLink,
  ImoveisList, ImovelTag, OperacaoTag, ContatoActions, ActionButton,
  PreviewBox, PreviewTextarea, Footer, ConfirmButton,
} from "./styles";

interface LocationState {
  contatos: ContatoComStatus[];
  resumo: {
    totalImoveisNoPdf: number;
    totalImoveis: number;
    totalContatos: number;
    novos: number;
    jaEnviados: number;
    telefoneInvalido: number;
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
  const queryClient = useQueryClient();
  const state = getRevisaoState(location.state);

  const [contatos, setContatos] = useState<ContatoComStatus[]>(
    state?.contatos || []
  );
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

  const confirmarMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ loteId: string }>("/envios/confirmar", {
        contatos: novos,
        pdfOrigem: state.pdfOrigem,
      }),
    onSuccess: (resultado) => {
      sessionStorage.removeItem("revisaoData");
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.lotes() });
      navigate(`/envio/${resultado.loteId}`);
    },
    onError: (err: unknown) => {
      let message = "Erro ao confirmar envio";
      const axiosErr = err as { response?: { data?: { error?: string } } };
      if (axiosErr.response?.data?.error) {
        message = axiosErr.response.data.error;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    },
  });

  const handleConfirmarEnvio = () => {
    if (novos.length === 0) return;
    setError("");
    confirmarMutation.mutate();
  };

  const loading = confirmarMutation.isPending;

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

      {state.resumo.telefoneInvalido > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", background: "#fefce8", border: "1px solid #fde047", borderRadius: "8px", color: "#854d0e", fontSize: "14px", margin: "0 0 16px" }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          {state.resumo.telefoneInvalido} imóvel(is) ignorado(s) por telefone inválido na planilha. Corrija os números e reenvie o arquivo caso necessário.
        </div>
      )}

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


