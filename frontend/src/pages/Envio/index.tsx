import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  Send,
  StopCircle,
  X,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { useTenant } from "@/hooks/useTenant";
import { TenantGuard } from "@/components/TenantGuard";
import { Lote, EnvioItem } from "@/types";

export function Envio() {
  const { loteId } = useParams<{ loteId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenantId: userTenantId, loading: tenantLoading, error: tenantError, isSuperAdmin } = useTenant();

  // Superadmin pode ver lotes de qualquer tenant via query param
  const tenantId = searchParams.get("tenant") || userTenantId;

  const [lote, setLote] = useState<Lote | null>(null);
  const [loteNotFound, setLoteNotFound] = useState(false);
  const [envios, setEnvios] = useState<EnvioItem[]>([]);

  // Escutar lote em tempo real
  useEffect(() => {
    if (!tenantId || !loteId) return;

    const loteRef = doc(db, `tenants/${tenantId}/lotes`, loteId);
    const unsubscribe = onSnapshot(loteRef, (snap) => {
      if (snap.exists()) {
        setLote({ id: snap.id, ...snap.data() } as Lote);
      } else {
        setLoteNotFound(true);
      }
    });

    return unsubscribe;
  }, [tenantId, loteId]);

  // Escutar envios em tempo real
  useEffect(() => {
    if (!tenantId || !loteId) return;

    const enviosRef = collection(
      db,
      `tenants/${tenantId}/lotes/${loteId}/envios`
    );
    const q = query(enviosRef, orderBy("criadoEm", "asc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as EnvioItem
      );
      setEnvios(items);
    });

    return unsubscribe;
  }, [tenantId, loteId]);

  if (tenantLoading || (!lote && !loteNotFound)) {
    return (
      <Container>
        <TenantGuard loading={tenantLoading} error={isSuperAdmin ? null : tenantError}>
          <LoadingState>
            <Loader size={32} className="spin" />
            <p>Carregando...</p>
          </LoadingState>
        </TenantGuard>
      </Container>
    );
  }

  if (loteNotFound || !lote) {
    return (
      <Container>
        <Header>
          <BackButton onClick={() => navigate("/")}>
            <ArrowLeft size={18} />
            Voltar
          </BackButton>
          <HeaderTitle>Envio não encontrado</HeaderTitle>
        </Header>
        <LoadingState>
          <p>Este lote de envio não foi encontrado ou já foi removido.</p>
          <BackButton onClick={() => navigate("/")}>
            <ArrowLeft size={18} />
            Voltar ao início
          </BackButton>
        </LoadingState>
      </Container>
    );
  }

  const cancelados = envios.filter((e) => e.status === "cancelado").length;
  const pendentes = envios.filter((e) => e.status === "pendente" || e.status === "enviando").length;
  const processados = lote.enviados + lote.erros + cancelados;

  const progresso =
    lote.totalEnvios > 0
      ? Math.round((processados / lote.totalEnvios) * 100)
      : 0;

  const finalizado = lote.status === "finalizado" || lote.status === "cancelado";

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Voltar
        </BackButton>
        <HeaderTitle>
          <Send size={18} />
          Envio - {lote.pdfOrigem}
        </HeaderTitle>
      </Header>

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
          <ProgressBarBg>
            <ProgressBarFill $percent={progresso} $done={finalizado} />
          </ProgressBarBg>
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
          {lote.status === "em_andamento" && (
            <CancelButton
              onClick={async () => {
                if (!confirm("Cancelar envio? Mensagens já enviadas não serão desfeitas.")) return;
                try {
                  await apiClient.post(`/envios/lotes/${loteId}/cancelar`, {});
                } catch {
                  alert("Erro ao cancelar envio. Tente novamente.");
                }
              }}
            >
              <StopCircle size={16} />
              Cancelar envio
            </CancelButton>
          )}
        </ProgressCard>

        {/* Lista de envios */}
        <EnviosList>
          {envios.map((envio) => (
            <EnvioCard key={envio.id} $status={envio.status}>
              <StatusIcon>
                {envio.status === "enviado" && (
                  <CheckCircle size={18} color="#16a34a" />
                )}
                {envio.status === "erro" && (
                  <XCircle size={18} color="#dc2626" />
                )}
                {envio.status === "enviando" && (
                  <Loader size={18} color="#f59e0b" className="spin" />
                )}
                {envio.status === "pendente" && (
                  <Clock size={18} color="#9ca3af" />
                )}
                {envio.status === "cancelado" && (
                  <StopCircle size={18} color="#9ca3af" />
                )}
              </StatusIcon>
              <EnvioInfo>
                <EnvioNome>{envio.nomeContato}</EnvioNome>
                <EnvioTelefone>{envio.telefone}</EnvioTelefone>
                {envio.erro && <EnvioErro>{envio.erro}</EnvioErro>}
              </EnvioInfo>
              <EnvioActions>
                <EnvioStatus $status={envio.status}>
                  {envio.status === "enviado" && "Enviado"}
                  {envio.status === "erro" && "Erro"}
                  {envio.status === "enviando" && "Enviando..."}
                  {envio.status === "pendente" && "Pendente"}
                  {envio.status === "cancelado" && "Cancelado"}
                </EnvioStatus>
                {envio.status === "pendente" && (
                  <CancelEnvioButton
                    onClick={async () => {
                      try {
                        await apiClient.post(
                          `/envios/lotes/${loteId}/envios/${envio.id}/cancelar`,
                          {}
                        );
                      } catch {
                        alert("Erro ao cancelar envio");
                      }
                    }}
                    title="Cancelar este envio"
                  >
                    <X size={14} />
                  </CancelEnvioButton>
                )}
              </EnvioActions>
            </EnvioCard>
          ))}
        </EnviosList>
      </Content>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 640px) {
    gap: 1rem;
    padding: 1rem 2rem;
  }
`;

const HeaderTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: 640px) {
    font-size: ${({ theme }) => theme.fontSize.lg};
  }
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

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
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

const ProgressBarBg = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colors.borderLight};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $percent: number; $done: boolean }>`
  height: 100%;
  width: ${(p) => p.$percent}%;
  background: ${(p) => (p.$done ? "#16a34a" : p.theme.colors.primary)};
  border-radius: 4px;
  transition: width 0.5s ease;
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

const EnvioStatus = styled.span<{ $status: string }>`
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${(p) =>
    p.$status === "enviado"
      ? "#16a34a"
      : p.$status === "erro"
        ? "#dc2626"
        : p.$status === "enviando"
          ? "#f59e0b"
          : "#9ca3af"};
  background: ${(p) =>
    p.$status === "enviado"
      ? "#f0fdf4"
      : p.$status === "erro"
        ? "#fef2f2"
        : p.$status === "enviando"
          ? "#fffbeb"
          : "#f9fafb"};
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
