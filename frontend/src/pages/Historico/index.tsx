import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  FileText,
  CheckCircle,
  XCircle,
  Loader,
  Clock,
  Search,
} from "lucide-react";
import {
  PageHeader,
  LoadingState as LoadingStateUI,
  EmptyState,
} from "@/components/ui";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { useTenant } from "@/hooks/useTenant";
import { TenantGuard } from "@/components/TenantGuard";
import { Lote } from "@/types";

export function Historico() {
  const navigate = useNavigate();
  const { tenantId, loading: tenantLoading, error: tenantError } = useTenant();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  // Escutar lotes
  useEffect(() => {
    if (!tenantId) return;

    const lotesRef = collection(db, `tenants/${tenantId}/lotes`);
    const q = query(lotesRef, orderBy("criadoEm", "desc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Lote
      );
      setLotes(items);
      setLoading(false);
    });

    return unsubscribe;
  }, [tenantId]);

  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return "-";
    const ts = timestamp as { seconds: number };
    return new Date(ts.seconds * 1000).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Container>
      <PageHeader
        title="Histórico de Envios"
        onBack={() => navigate("/")}
        actions={
          <SearchContactButton onClick={() => navigate("/historico/contato")}>
            <Search size={16} />
            Buscar contato
          </SearchContactButton>
        }
      />

      <TenantGuard loading={tenantLoading} error={tenantError}>
      <Content>
        {loading ? (
          <LoadingStateUI>
            <Loader size={32} className="spin" />
            <p>Carregando...</p>
          </LoadingStateUI>
        ) : lotes.length === 0 ? (
          <EmptyState>
            <FileText size={48} color="#9ca3af" />
            <p>Nenhum envio realizado ainda.</p>
          </EmptyState>

        ) : (
          <LotesList>
            {lotes.map((lote) => (
              <LoteCard
                key={lote.id}
                onClick={() => navigate(`/envio/${lote.id}`)}
              >
                <LoteHeader>
                  <LoteStatus $status={lote.status}>
                    {lote.status === "finalizado" && (
                      <CheckCircle size={16} />
                    )}
                    {lote.status === "em_andamento" && (
                      <Loader size={16} className="spin" />
                    )}
                    {lote.status === "cancelado" && <XCircle size={16} />}
                    {lote.status === "finalizado"
                      ? "Finalizado"
                      : lote.status === "em_andamento"
                        ? "Em andamento"
                        : "Cancelado"}
                  </LoteStatus>
                  <LoteDate>
                    <Clock size={14} />
                    {formatDate(lote.criadoEm)}
                  </LoteDate>
                </LoteHeader>

                <LotePdf>
                  <FileText size={16} />
                  {lote.pdfOrigem}
                </LotePdf>

                <LoteStats>
                  <LoteStat>
                    <strong>{lote.totalEnvios}</strong> total
                  </LoteStat>
                  <LoteStat $color="green">
                    <strong>{lote.enviados}</strong> enviados
                  </LoteStat>
                  {lote.erros > 0 && (
                    <LoteStat $color="red">
                      <strong>{lote.erros}</strong> erros
                    </LoteStat>
                  )}
                </LoteStats>
              </LoteCard>
            ))}
          </LotesList>
        )}
      </Content>
      </TenantGuard>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;


const SearchContactButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: 500;
  flex-shrink: 0;

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
  max-width: 800px;
  margin: 1rem auto;
  padding: 0 1rem;

  @media (min-width: 640px) {
    margin: 2rem auto;
    padding: 0 2rem;
  }
`;


const LotesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const LoteCard = styled.div`
  padding: 1.25rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoteHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const LoteStatus = styled.span<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 600;
  color: ${(p) =>
    p.$status === "finalizado"
      ? "#16a34a"
      : p.$status === "em_andamento"
        ? "#f59e0b"
        : "#dc2626"};
`;

const LoteDate = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LotePdf = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 500;
  margin-bottom: 0.75rem;
`;

const LoteStats = styled.div`
  display: flex;
  gap: 1rem;
`;

const LoteStat = styled.span<{ $color?: string }>`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${(p) =>
    p.$color === "green"
      ? "#16a34a"
      : p.$color === "red"
        ? "#dc2626"
        : p.theme.colors.textSecondary};

  strong {
    font-weight: 700;
  }
`;
