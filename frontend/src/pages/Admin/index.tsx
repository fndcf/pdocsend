import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  Users,
  UserPlus,
  Building2,
  Activity,
  Loader,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  Settings,
} from "lucide-react";
import { ErrorAlert, SuccessAlert } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminData, type Cliente, type Pendente, type Tab } from "@/hooks/useAdminData";
import { ClienteFormModal } from "./ClienteFormModal";

export function Admin() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>("clientes");
  const { clientes, pendentes, monitoramento, loading, error, reload: loadData } = useAdminData(tab);

  const [formSuccess, setFormSuccess] = useState("");
  const [modalMode, setModalMode] = useState<"criar" | "editar" | null>(null);
  const [selectedPendente, setSelectedPendente] = useState<Pendente | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  const openNovoCliente = (pendente: Pendente) => {
    setSelectedPendente(pendente);
    setModalMode("criar");
    setFormSuccess("");
  };

  const openEditCliente = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setModalMode("editar");
    setFormSuccess("");
  };

  const handleModalSuccess = (message: string) => {
    setFormSuccess(message);
    setModalMode(null);
    setSelectedPendente(null);
    setEditingCliente(null);
    loadData();
  };

  const handleModalClose = () => {
    setModalMode(null);
    setSelectedPendente(null);
    setEditingCliente(null);
  };

  return (
    <Container>
      <Header>
        <Logo>PDocSend</Logo>
        <HeaderTitle>Painel Admin</HeaderTitle>
        <LogoutButton onClick={logout}>
          <LogOut size={16} />
          Sair
        </LogoutButton>
      </Header>

      <Tabs>
        <TabButton $active={tab === "clientes"} onClick={() => setTab("clientes")}>
          <Building2 size={16} />
          Clientes
        </TabButton>
        <TabButton $active={tab === "pendentes"} onClick={() => setTab("pendentes")}>
          <UserPlus size={16} />
          Pendentes
          {pendentes.length > 0 && <Badge>{pendentes.length}</Badge>}
        </TabButton>
        <TabButton $active={tab === "monitoramento"} onClick={() => setTab("monitoramento")}>
          <Activity size={16} />
          Monitoramento
        </TabButton>
      </Tabs>

      <Content>
        {formSuccess && <StyledSuccessAlert message={formSuccess} />}
        {error && <StyledErrorAlert message={error} />}

        {loading ? (
          <LoadingState>
            <Loader size={32} className="spin" />
          </LoadingState>
        ) : (
          <>
            {tab === "clientes" && (
              <Section>
                {clientes.length === 0 ? (
                  <EmptyState>Nenhum cliente cadastrado.</EmptyState>
                ) : (
                  clientes.map((cliente) => (
                    <Card key={cliente.id} $clickable onClick={() => openEditCliente(cliente)}>
                      <CardHeader>
                        <CardTitle>{cliente.nome}</CardTitle>
                        <CardActions>
                          <CardBadge>{cliente.zapiInstanceId ? "Z-API ativo" : "Sem Z-API"}</CardBadge>
                          <EditButton title="Editar">
                            <Settings size={14} />
                          </EditButton>
                        </CardActions>
                      </CardHeader>
                      <CardDetail>
                        <Users size={14} />
                        {cliente.usuarios.map((u) => u.email).join(", ") || "Sem usuários"}
                      </CardDetail>
                      <CardDetail>
                        Corretor: {cliente.mensagemTemplate?.nomeCorretor} | Empresa: {cliente.mensagemTemplate?.nomeEmpresa} | Limite: {cliente.limiteDiario}/dia
                      </CardDetail>
                    </Card>
                  ))
                )}
              </Section>
            )}

            {tab === "pendentes" && (
              <Section>
                {pendentes.length === 0 ? (
                  <EmptyState>Nenhum usuário pendente.</EmptyState>
                ) : (
                  pendentes.map((pendente) => (
                    <Card key={pendente.uid}>
                      <CardHeader>
                        <CardTitle>{pendente.email}</CardTitle>
                        <ConfigButton onClick={() => openNovoCliente(pendente)}>
                          <UserPlus size={14} />
                          Configurar
                        </ConfigButton>
                      </CardHeader>
                      <CardDetail>
                        <Clock size={14} />
                        Registrado em {pendente.criadoEm ? new Date(pendente.criadoEm).toLocaleDateString("pt-BR") : "-"}
                      </CardDetail>
                    </Card>
                  ))
                )}
              </Section>
            )}

            {tab === "monitoramento" && (
              <Section>
                {monitoramento.length === 0 ? (
                  <EmptyState>Nenhum dado de monitoramento.</EmptyState>
                ) : (
                  monitoramento.map((item) => (
                    <Card key={item.tenantId}>
                      <CardHeader>
                        <CardTitle>{item.nome} <CardSubtitle>({item.corretor})</CardSubtitle></CardTitle>
                        <MonitorStats>
                          <MonitorStat $color="green">{item.totalEnviados} enviados</MonitorStat>
                          {item.totalErros > 0 && (
                            <MonitorStat $color="red">{item.totalErros} erros</MonitorStat>
                          )}
                        </MonitorStats>
                      </CardHeader>
                      {item.lotesRecentes.map((lote) => (
                        <LoteItem key={lote.id} onClick={() => navigate(`/envio/${lote.id}?tenant=${item.tenantId}`)}>
                          <LoteIcon>
                            {lote.status === "finalizado" && <CheckCircle size={14} color="#16a34a" />}
                            {lote.status === "em_andamento" && <Loader size={14} color="#f59e0b" />}
                            {lote.status === "cancelado" && <XCircle size={14} color="#dc2626" />}
                          </LoteIcon>
                          <LoteInfo>
                            <span>{lote.pdfOrigem}</span>
                            <LoteStats>{lote.enviados}/{lote.totalEnvios} enviados</LoteStats>
                          </LoteInfo>
                        </LoteItem>
                      ))}
                    </Card>
                  ))
                )}
              </Section>
            )}
          </>
        )}
      </Content>

      {modalMode === "criar" && selectedPendente && (
        <ClienteFormModal
          mode="criar"
          pendente={selectedPendente}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {modalMode === "editar" && editingCliente && (
        <ClienteFormModal
          mode="editar"
          cliente={editingCliente}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const Header = styled.header`
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  @media (min-width: 640px) { gap: 1rem; padding: 1rem 2rem; }
`;

const Logo = styled.h1`
  font-size: 1.25rem; font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
`;

const HeaderTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSize.lg}; font-weight: 700;
  flex: 1; text-align: center;
`;

const LogoutButton = styled.button`
  display: flex; align-items: center; gap: 0.375rem;
  padding: 0.375rem 0.75rem; background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.xs}; font-weight: 500;
  &:hover { background: ${({ theme }) => theme.colors.borderLight}; color: ${({ theme }) => theme.colors.text}; }
`;

const Tabs = styled.div`
  display: flex; gap: 0;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0 1rem; overflow-x: auto;
  @media (min-width: 640px) { padding: 0 2rem; }
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex; align-items: center; gap: 0.375rem;
  padding: 0.75rem 1rem; background: none; border: none;
  border-bottom: 2px solid ${(p) => p.$active ? p.theme.colors.primary : "transparent"};
  color: ${(p) => p.$active ? p.theme.colors.primary : p.theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${(p) => p.$active ? 600 : 400};
  cursor: pointer; white-space: nowrap;
  &:hover { color: ${({ theme }) => theme.colors.primary}; }
`;

const Badge = styled.span`
  background: ${({ theme }) => theme.colors.error};
  color: white; font-size: 0.625rem; font-weight: 700;
  padding: 0.125rem 0.375rem; border-radius: 999px;
`;

const Content = styled.main`
  max-width: 800px; margin: 1rem auto; padding: 0 1rem;
  @media (min-width: 640px) { margin: 2rem auto; padding: 0 2rem; }
`;

const Section = styled.div`
  display: flex; flex-direction: column; gap: 0.5rem;
`;

const LoadingState = styled.div`
  display: flex; justify-content: center; padding: 3rem;
`;

const EmptyState = styled.div`
  text-align: center; padding: 3rem; color: ${({ theme }) => theme.colors.textSecondary};
`;

const StyledSuccessAlert = styled(SuccessAlert)`margin-bottom: 1rem;`;
const StyledErrorAlert = styled(ErrorAlert)`margin-bottom: 1rem;`;

const Card = styled.div<{ $clickable?: boolean }>`
  padding: 1rem; background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: ${(p) => p.$clickable ? "pointer" : "default"};
  transition: box-shadow 0.2s;
  ${(p) => p.$clickable && `&:hover { box-shadow: ${p.theme.shadows.md}; }`}
`;

const CardHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;
`;

const CardTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSize.md}; font-weight: 600;
`;

const CardSubtitle = styled.span`
  font-weight: 400; font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const CardActions = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
`;

const CardBadge = styled.span`
  font-size: ${({ theme }) => theme.fontSize.xs}; font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: #f0fdf4; color: #16a34a;
`;

const EditButton = styled.button`
  display: flex; align-items: center; padding: 0.25rem;
  background: none; border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer; border-radius: ${({ theme }) => theme.borderRadius.sm};
  &:hover { color: ${({ theme }) => theme.colors.primary}; background: ${({ theme }) => theme.colors.borderLight}; }
`;

const CardDetail = styled.div`
  display: flex; align-items: center; gap: 0.375rem;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 0.25rem;
`;

const ConfigButton = styled.button`
  display: flex; align-items: center; gap: 0.375rem;
  padding: 0.375rem 0.75rem; background: ${({ theme }) => theme.colors.primary};
  color: white; border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.xs}; font-weight: 600;
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.primaryHover}; }
`;

const MonitorStats = styled.div`display: flex; gap: 0.5rem;`;

const MonitorStat = styled.span<{ $color: string }>`
  font-size: ${({ theme }) => theme.fontSize.xs}; font-weight: 600;
  color: ${(p) => p.$color === "green" ? "#16a34a" : "#dc2626"};
`;

const LoteItem = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0; border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
  cursor: pointer;
  &:hover { opacity: 0.8; }
`;

const LoteIcon = styled.div`flex-shrink: 0;`;

const LoteInfo = styled.div`
  flex: 1; font-size: ${({ theme }) => theme.fontSize.sm};
`;

const LoteStats = styled.span`
  margin-left: 0.5rem; color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.xs};
`;
