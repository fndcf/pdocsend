import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowLeft,
  Search,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Loader,
} from "lucide-react";
import apiClient from "@/services/apiClient";

interface ImovelEnviado {
  id: string;
  telefone: string;
  edificio: string;
  endereco: string;
  numero: string;
  apartamento: string;
  loteId: string;
  enviadoEm: unknown;
}

interface HistoricoResponse {
  telefone: string;
  envios: ImovelEnviado[];
  lotes: Record<string, { id: string; pdfOrigem: string; criadoEm: { seconds: number } }>;
  total: number;
}

export function HistoricoContato() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTelefone = searchParams.get("telefone") || "";

  const [telefone, setTelefone] = useState(initialTelefone);
  const [resultado, setResultado] = useState<HistoricoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [buscou, setBuscou] = useState(false);

  const handleBuscar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!telefone.trim()) return;

    setLoading(true);
    setError("");
    setBuscou(true);

    try {
      const telNormalizado = normalizarTelefone(telefone);
      const data = await apiClient.get<HistoricoResponse>(
        `/envios/contato/${telNormalizado}`
      );
      setResultado(data);
    } catch {
      setError("Erro ao buscar histórico");
    } finally {
      setLoading(false);
    }
  };

  const normalizarTelefone = (tel: string): string => {
    const digits = tel.replace(/\D/g, "");
    if (digits.startsWith("55") && digits.length >= 12) return digits;
    if (digits.length === 11) return `55${digits}`;
    if (digits.length === 10) return `55${digits.substring(0, 2)}9${digits.substring(2)}`;
    if (digits.length === 9) return `5511${digits}`;
    return digits;
  };

  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return "-";
    const opts: Intl.DateTimeFormatOptions = {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    };
    // Firestore Timestamp { seconds } ou { _seconds }
    if (typeof timestamp === "object" && timestamp !== null) {
      const ts = timestamp as Record<string, unknown>;
      const seconds = (ts.seconds || ts._seconds) as number | undefined;
      if (seconds) {
        return new Date(seconds * 1000).toLocaleDateString("pt-BR", opts);
      }
    }
    // Date string ou number
    const date = new Date(timestamp as string | number);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("pt-BR", opts);
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Voltar
        </BackButton>
        <HeaderTitle>Histórico por Contato</HeaderTitle>
      </Header>

      <Content>
        <SearchForm onSubmit={handleBuscar}>
          <SearchInput
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Digite o telefone (ex: 11999990000)"
            disabled={loading}
          />
          <SearchButton type="submit" disabled={loading || !telefone.trim()}>
            {loading ? <Loader size={18} className="spin" /> : <Search size={18} />}
          </SearchButton>
        </SearchForm>

        {error && (
          <ErrorBox>
            <AlertCircle size={16} />
            {error}
          </ErrorBox>
        )}

        {buscou && !loading && resultado && resultado.total === 0 && (
          <EmptyState>
            <Phone size={40} color="#9ca3af" />
            <p>Nenhum envio encontrado para este telefone.</p>
          </EmptyState>
        )}

        {resultado && resultado.total > 0 && (
          <>
            <ResultHeader>
              <Phone size={16} />
              <span>{resultado.telefone}</span>
              <ResultCount>{resultado.total} imóvel(is) enviado(s)</ResultCount>
            </ResultHeader>

            <EnviosList>
              {resultado.envios.map((envio) => {
                const lote = resultado.lotes[envio.loteId];
                const referencia = envio.edificio
                  ? `${envio.edificio}${envio.apartamento ? ` Apt ${envio.apartamento}` : ""}`
                  : `${envio.endereco}, ${envio.numero}${envio.apartamento ? ` Apt ${envio.apartamento}` : ""}`;

                return (
                  <EnvioCard key={envio.id}>
                    <EnvioIconRow>
                      <MapPin size={16} color="#2563eb" />
                      <EnvioReferencia>{referencia}</EnvioReferencia>
                    </EnvioIconRow>
                    <EnvioDetails>
                      <EnvioDetail>
                        <Calendar size={12} />
                        {formatDate(envio.enviadoEm)}
                      </EnvioDetail>
                      {lote && (
                        <EnvioDetail
                          $clickable
                          onClick={() => navigate(`/envio/${envio.loteId}`)}
                        >
                          PDF: {lote.pdfOrigem}
                        </EnvioDetail>
                      )}
                    </EnvioDetails>
                  </EnvioCard>
                );
              })}
            </EnviosList>
          </>
        )}
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
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 700;
  flex: 1;
  text-align: center;

  @media (min-width: 640px) {
    font-size: ${({ theme }) => theme.fontSize.lg};
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.xs};
  flex-shrink: 0;

  @media (min-width: 640px) {
    padding: 0.5rem 0.75rem;
    font-size: ${({ theme }) => theme.fontSize.sm};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
  }
`;

const Content = styled.main`
  max-width: 600px;
  margin: 1.5rem auto;
  padding: 0 1rem;

  @media (min-width: 640px) {
    margin: 2rem auto;
    padding: 0 1.5rem;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const SearchForm = styled.form`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.md};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const SearchButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1rem;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: #991b1b;
  font-size: ${({ theme }) => theme.fontSize.sm};
  margin-bottom: 1rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 600;
`;

const ResultCount = styled.span`
  font-weight: 400;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-left: auto;
`;

const EnviosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EnvioCard = styled.div`
  padding: 0.875rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const EnvioIconRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EnvioReferencia = styled.span`
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const EnvioDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding-left: 1.5rem;
`;

const EnvioDetail = styled.span<{ $clickable?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: ${(p) => (p.$clickable ? "pointer" : "default")};

  &:hover {
    ${(p) => p.$clickable && "color: #2563eb; text-decoration: underline;"}
  }
`;
