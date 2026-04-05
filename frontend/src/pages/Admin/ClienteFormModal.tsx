import { useState } from "react";
import styled from "styled-components";
import { X } from "lucide-react";
import { ErrorAlert, Modal as ModalUI } from "@/components/ui";
import apiClient from "@/services/apiClient";
import type { Cliente, Pendente } from "@/hooks/useAdminData";

interface ClienteFormModalProps {
  mode: "criar" | "editar";
  pendente?: Pendente;
  cliente?: Cliente;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function ClienteFormModal({ mode, pendente, cliente, onClose, onSuccess }: ClienteFormModalProps) {
  const [formNome, setFormNome] = useState(cliente?.nome || "");
  const [formCorretor, setFormCorretor] = useState(cliente?.mensagemTemplate?.nomeCorretor || "");
  const [formEmpresa, setFormEmpresa] = useState(cliente?.mensagemTemplate?.nomeEmpresa || "");
  const [formCargo, setFormCargo] = useState(cliente?.mensagemTemplate?.cargo || "corretor");
  const [formInstanceId, setFormInstanceId] = useState("");
  const [formToken, setFormToken] = useState("");
  const [formClientToken, setFormClientToken] = useState("");
  const [formLimiteDiario, setFormLimiteDiario] = useState(String(cliente?.limiteDiario || 200));
  const [formTextoPersonalizado, setFormTextoPersonalizado] = useState(
    (cliente?.mensagemTemplate as Record<string, string>)?.textoPersonalizado || ""
  );
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      if (mode === "criar" && pendente) {
        await apiClient.post("/admin/clientes", {
          uid: pendente.uid,
          nome: formNome,
          nomeCorretor: formCorretor,
          nomeEmpresa: formEmpresa,
          cargo: formCargo,
          ...(formTextoPersonalizado && { textoPersonalizado: formTextoPersonalizado }),
          zapiInstanceId: formInstanceId,
          zapiToken: formToken,
          zapiClientToken: formClientToken,
          limiteDiario: formLimiteDiario,
        });
        onSuccess(`Cliente ${formNome} configurado com sucesso!`);
      } else if (mode === "editar" && cliente) {
        const body: Record<string, string> = {};
        if (formNome) body.nome = formNome;
        if (formCorretor) body.nomeCorretor = formCorretor;
        if (formEmpresa) body.nomeEmpresa = formEmpresa;
        if (formCargo) body.cargo = formCargo;
        body.textoPersonalizado = formTextoPersonalizado;
        if (formInstanceId) body.zapiInstanceId = formInstanceId;
        if (formToken) body.zapiToken = formToken;
        if (formClientToken) body.zapiClientToken = formClientToken;
        if (formLimiteDiario) body.limiteDiario = formLimiteDiario;

        await apiClient.put(`/admin/clientes/${cliente.id}`, body);
        onSuccess(`Cliente ${formNome} atualizado com sucesso!`);
      }
    } catch {
      setFormError(mode === "criar" ? "Erro ao criar cliente" : "Erro ao atualizar cliente");
    } finally {
      setFormLoading(false);
    }
  };

  const title = mode === "criar" ? "Configurar novo cliente" : "Editar cliente";
  const subtitle = mode === "criar" ? `Usuário: ${pendente?.email}` : cliente?.nome || "";
  const submitLabel = mode === "criar"
    ? (formLoading ? "Configurando..." : "Configurar cliente")
    : (formLoading ? "Salvando..." : "Salvar alterações");

  return (
    <ModalUI onClose={onClose} maxWidth="520px">
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
        <CloseButton onClick={onClose}><X size={20} /></CloseButton>
      </ModalHeader>
      <ModalSubtitle>{subtitle}</ModalSubtitle>

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Nome da empresa</Label>
          <Input value={formNome} onChange={(e) => setFormNome(e.target.value)} required={mode === "criar"} />
        </FormGroup>
        <FormRow>
          <FormGroup>
            <Label>Nome do corretor</Label>
            <Input value={formCorretor} onChange={(e) => setFormCorretor(e.target.value)} required={mode === "criar"} />
          </FormGroup>
          <FormGroup>
            <Label>Cargo</Label>
            <Input value={formCargo} onChange={(e) => setFormCargo(e.target.value)} />
          </FormGroup>
        </FormRow>
        <FormGroup>
          <Label>Nome da empresa (na mensagem)</Label>
          <Input value={formEmpresa} onChange={(e) => setFormEmpresa(e.target.value)} required={mode === "criar"} />
        </FormGroup>
        <FormGroup>
          <Label>Z-API Instance ID{mode === "editar" && " (deixe vazio para manter)"}</Label>
          <Input
            value={formInstanceId}
            onChange={(e) => setFormInstanceId(e.target.value)}
            required={mode === "criar"}
            placeholder={mode === "editar" ? "Manter atual" : undefined}
          />
        </FormGroup>
        <FormRow>
          <FormGroup>
            <Label>Z-API Token{mode === "editar" && " (vazio = manter)"}</Label>
            <Input
              value={formToken}
              onChange={(e) => setFormToken(e.target.value)}
              required={mode === "criar"}
              placeholder={mode === "editar" ? "Manter atual" : undefined}
            />
          </FormGroup>
          <FormGroup>
            <Label>Z-API Client Token{mode === "editar" && " (vazio = manter)"}</Label>
            <Input
              value={formClientToken}
              onChange={(e) => setFormClientToken(e.target.value)}
              required={mode === "criar"}
              placeholder={mode === "editar" ? "Manter atual" : undefined}
            />
          </FormGroup>
        </FormRow>
        <FormGroup>
          <Label>Limite diário de mensagens</Label>
          <Input type="number" value={formLimiteDiario} onChange={(e) => setFormLimiteDiario(e.target.value)} min="1" max="1000" />
        </FormGroup>
        <FormGroup>
          <Label>Mensagem personalizada{mode === "editar" && " (vazio = texto padrão)"}</Label>
          <Textarea
            value={formTextoPersonalizado}
            onChange={(e) => setFormTextoPersonalizado(e.target.value)}
            rows={5}
            placeholder={"{saudacao} {nome}, tudo bem?\nSou o {nomeCorretor}, {cargo} do {nomeEmpresa}. Estou entrando em contato para saber se você tem interesse em conversarmos sobre {operacao}.\n\nFico à disposição!"}
          />
          <HelpText>
            Variáveis: {"{saudacao}"}, {"{nome}"}, {"{nomeCorretor}"}, {"{nomeEmpresa}"}, {"{cargo}"}, {"{operacao}"}
          </HelpText>
        </FormGroup>

        {formError && <ErrorAlert message={formError} />}

        <SubmitButton type="submit" disabled={formLoading}>
          {submitLabel}
        </SubmitButton>
      </Form>
    </ModalUI>
  );
}

const ModalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center;
`;

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.lg}; font-weight: 700;
`;

const ModalSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 1.25rem;
`;

const CloseButton = styled.button`
  background: none; border: none; color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer; padding: 0.25rem;
`;

const Form = styled.form`
  display: flex; flex-direction: column; gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 0.25rem; flex: 1;
`;

const FormRow = styled.div`
  display: flex; gap: 0.75rem;
  @media (max-width: 480px) { flex-direction: column; }
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSize.sm}; font-weight: 600;
`;

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.sm};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const Textarea = styled.textarea`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-family: inherit; line-height: 1.5;
  outline: none; resize: vertical;
  &:focus { border-color: ${({ theme }) => theme.colors.primary}; }
`;

const HelpText = styled.span`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.4;
`;

const SubmitButton = styled.button`
  padding: 0.75rem; background: ${({ theme }) => theme.colors.primary};
  color: white; border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.md}; font-weight: 600;
  cursor: pointer; margin-top: 0.5rem;
  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.primaryHover}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
