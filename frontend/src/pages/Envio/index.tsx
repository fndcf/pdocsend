import { useCallback, memo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import styled from "styled-components";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  Send,
  StopCircle,
  X,
} from "lucide-react";
import {
  PageHeader,
  BackButton,
  LoadingState as LoadingStateUI,
  StatusBadge,
  ProgressBar,
} from "@/components/ui";
import apiClient from "@/services/apiClient";
import { useTenant } from "@/hooks/useTenant";
import { useLoteProgress } from "@/hooks/useLoteProgress";
import { TenantGuard } from "@/components/TenantGuard";
import { EnvioItem, ENVIO_STATUS, LOTE_STATUS } from "@/types";

export function Envio() {
  const { loteId } = useParams<{ loteId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenantId: userTenantId, loading: tenantLoading, error: tenantError, isSuperAdmin } = useTenant();

  // Superadmin pode ver lotes de qualquer tenant via query param
  const tenantId = searchParams.get("tenant") || userTenantId || "";

  const { lote, loteNotFound, envios: rawEnvios, progresso, finalizado, cancelados, pendentes } =
    useLoteProgress(tenantId, loteId);

  // Optimistic updates: IDs marcados como cancelados antes do onSnapshot atualizar
  const [optimisticCancelados, setOptimisticCancelados] = useState<Set<string>>(new Set());

  const envios = rawEnvios.map((e) =>
    optimisticCancelados.has(e.id) && e.status === ENVIO_STATUS.PENDENTE
      ? { ...e, status: ENVIO_STATUS.CANCELADO as typeof e.status }
      : e
  );

  const cancelarLoteMutation = useMutation({
    mutationFn: () => apiClient.post(`/envios/lotes/${loteId}/cancelar`, {}),
    onError: () => alert("Erro ao cancelar envio. Tente novamente."),
  });

  const cancelarEnvioMutation = useMutation({
    mutationFn: (envioId: string) =>
      apiClient.post(`/envios/lotes/${loteId}/envios/${envioId}/cancelar`, {}),
    onMutate: (envioId: string) => {
      setOptimisticCancelados((prev) => new Set(prev).add(envioId));
    },
    onError: (_err, envioId: string) => {
      setOptimisticCancelados((prev) => {
        const next = new Set(prev);
        next.delete(envioId);
        return next;
      });
      alert("Erro ao cancelar envio");
    },
  });

  const handleCancelarLote = useCallback(() => {
    if (!confirm("Cancelar envio? Mensagens já enviadas não serão desfeitas.")) return;
    cancelarLoteMutation.mutate();
  }, [cancelarLoteMutation]);

  const handleCancelarEnvio = useCallback(
    (envioId: string) => cancelarEnvioMutation.mutate(envioId),
    [cancelarEnvioMutation]
  );

  if (tenantLoading || (!lote && !loteNotFound)) {
    return (
      <Container>
        <TenantGuard loading={tenantLoading} error={isSuperAdmin ? null : tenantError}>
          <LoadingStateUI>
            <Loader size={32} className="spin" />
            <p>Carregando...</p>
          </LoadingStateUI>
        </TenantGuard>
      </Container>
    );
  }

  if (loteNotFound || !lote) {
    return (
      <Container>
        <PageHeader title="Envio não encontrado" onBack={() => navigate("/")} />
        <LoadingStateUI>
          <p>Este lote de envio não foi encontrado ou já foi removido.</p>
          <BackButton onClick={() => navigate("/")}>Voltar ao início</BackButton>
        </LoadingStateUI>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title={<><Send size={18} /> Envio - {lote.pdfOrigem}</>}
        onBack={() => navigate("/")}
      />

      <Content>
        {/* Progresso */}
        <ProgressCard>
          <ProgressHeader>
            {finalizado ? (
              <ProgressTitle>Envio finalizado</ProgressTitle>
            ) : (
              <ProgressTitle>
                Enviando {lote.enviados + lote.erros}/{lote.totalEnvios}...
              </ProgressTitle>
            )}
            <ProgressPercent>{progresso}%</ProgressPercent>
          </ProgressHeader>
          <ProgressBar percent={progresso} done={finalizado} />
          <ProgressStats>
            <Stat>
              <StatIcon $color="green">
                <CheckCircle size={14} />
              </StatIcon>
              {lote.enviados} enviado(s)
            </Stat>
            <Stat>
              <StatIcon $color="red">
                <XCircle size={14} />
              </StatIcon>
              {lote.erros} erro(s)
            </Stat>
            {cancelados > 0 && (
              <Stat>
                <StatIcon $color="gray">
                  <StopCircle size={14} />
                </StatIcon>
                {cancelados} cancelado(s)
              </Stat>
            )}
            {pendentes > 0 && (
              <Stat>
                <StatIcon $color="gray">
                  <Clock size={14} />
                </StatIcon>
                {pendentes} pendente(s)
              </Stat>
            )}
          </ProgressStats>
          {lote.status === LOTE_STATUS.EM_ANDAMENTO && (
            <CancelButton onClick={handleCancelarLote}>
              <StopCircle size={16} />
              Cancelar envio
            </CancelButton>
          )}
        </ProgressCard>

        {/* Lista de envios */}
        <EnviosList>
          {envios.map((envio) => (
            <EnvioCardItem
              key={envio.id}
              envio={envio}
              onCancel={handleCancelarEnvio}
            />
          ))}
        </EnviosList>
      </Content>
    </Container>
  );
}

const statusLabels: Record<string, string> = {
  [ENVIO_STATUS.ENVIADO]: "Enviado",
  [ENVIO_STATUS.ERRO]: "Erro",
  [ENVIO_STATUS.ENVIANDO]: "Enviando...",
  [ENVIO_STATUS.PENDENTE]: "Pendente",
  [ENVIO_STATUS.CANCELADO]: "Cancelado",
};

const EnvioCardItem = memo(function EnvioCardItem({
  envio,
  onCancel,
}: {
  envio: EnvioItem;
  onCancel: (envioId: string) => void;
}) {
  return (
    <EnvioCard $status={envio.status}>
      <StatusIcon>
        {envio.status === ENVIO_STATUS.ENVIADO && <CheckCircle size={18} color="#16a34a" />}
        {envio.status === ENVIO_STATUS.ERRO && <XCircle size={18} color="#dc2626" />}
        {envio.status === ENVIO_STATUS.ENVIANDO && <Loader size={18} color="#f59e0b" className="spin" />}
        {envio.status === ENVIO_STATUS.PENDENTE && <Clock size={18} color="#9ca3af" />}
        {envio.status === ENVIO_STATUS.CANCELADO && <StopCircle size={18} color="#9ca3af" />}
      </StatusIcon>
      <EnvioInfo>
        <EnvioNome>{envio.nomeContato}</EnvioNome>
        <EnvioTelefone>{envio.telefone}</EnvioTelefone>
        {envio.erro && <EnvioErro>{envio.erro}</EnvioErro>}
      </EnvioInfo>
      <EnvioActions>
        <StatusBadge $status={envio.status}>
          {statusLabels[envio.status] || envio.status}
        </StatusBadge>
        {envio.status === ENVIO_STATUS.PENDENTE && (
          <CancelEnvioButton
            onClick={() => onCancel(envio.id)}
            title="Cancelar este envio"
          >
            <X size={14} />
          </CancelEnvioButton>
        )}
      </EnvioActions>
    </EnvioCard>
  );
});

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;


const Content = styled.main`
  max-width: 800px;
  margin: 1rem auto;
  padding: 0 1rem;

  @media (min-width: 640px) {
    margin: 2rem auto;
    padding: 0 2rem;
  }
`;

const ProgressCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  margin-bottom: 1.5rem;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const ProgressTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: 700;
`;

const ProgressPercent = styled.span`
  font-size: ${({ theme }) => theme.fontSize.xxl};
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
`;


const ProgressStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;

  @media (min-width: 640px) {
    gap: 1.5rem;
  }
`;

const CancelButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #fef2f2;
  }
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const StatIcon = styled.span<{ $color: string }>`
  display: flex;
  color: ${(p) =>
    p.$color === "green"
      ? "#16a34a"
      : p.$color === "red"
        ? "#dc2626"
        : "#9ca3af"};
`;

const EnviosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EnvioCard = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  opacity: ${(p) => (p.$status === "pendente" ? 0.6 : 1)};

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const StatusIcon = styled.div`
  flex-shrink: 0;
`;

const EnvioInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const EnvioNome = styled.div`
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.sm};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EnvioTelefone = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const EnvioErro = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.error};
  margin-top: 0.125rem;
`;

const EnvioActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
`;


const CancelEnvioButton = styled.button`
  display: flex;
  align-items: center;
  padding: 0.25rem;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;

  &:hover {
    background: #fef2f2;
    border-color: ${({ theme }) => theme.colors.error};
    color: ${({ theme }) => theme.colors.error};
  }
`;
