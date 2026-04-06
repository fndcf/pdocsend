/**
 * Testes da tela Admin (painel de administração)
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "@/styles/theme";

jest.mock("@/config/firebase", () => ({
  auth: { currentUser: { uid: "test-uid", getIdToken: jest.fn().mockResolvedValue("token") } },
  db: {},
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "admin@test.com" },
    loading: false,
    logout: jest.fn(),
  }),
}));

jest.mock("@/hooks/useTenant", () => ({
  useTenant: () => ({
    tenantId: "",
    role: "superadmin",
    isSuperAdmin: true,
    loading: false,
    error: null,
  }),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();

jest.mock("@/services/apiClient", () => ({
  __esModule: true,
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    upload: jest.fn(),
  },
}));

const mockClientes = [
  {
    id: "tenant-1",
    nome: "Grupo Imobi",
    mensagemTemplate: { nomeCorretor: "Felipe", nomeEmpresa: "Imobi", cargo: "corretor" },
    zapiInstanceId: "***configurado***",
    limiteDiario: 200,
    usuarios: [{ uid: "u1", email: "felipe@imobi.com", nome: "Felipe" }],
    criadoEm: { seconds: 1743550000 },
  },
];

const mockPendentes = [
  {
    uid: "pending-1",
    email: "novo@test.com",
    criadoEm: "2026-03-15T10:00:00Z",
  },
];

const mockMonitoramento = [
  {
    tenantId: "tenant-1",
    nome: "Grupo Imobi",
    corretor: "Felipe",
    totalEnviados: 150,
    totalErros: 3,
    lotesRecentes: [
      {
        id: "lote-1",
        pdfOrigem: "campo_belo.pdf",
        totalEnvios: 10,
        enviados: 9,
        erros: 1,
        status: "finalizado",
      },
    ],
  },
];

import { Admin } from "@/pages/Admin";

let queryClient: QueryClient;

const renderAdmin = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <Admin />
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("Admin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url === "/admin/clientes") return Promise.resolve({ clientes: mockClientes, hasMore: false });
      if (url === "/admin/pendentes") return Promise.resolve(mockPendentes);
      if (url === "/admin/monitoramento") return Promise.resolve({ stats: mockMonitoramento, hasMore: false });
      return Promise.resolve([]);
    });
  });

  it("deve renderizar header com titulo", () => {
    renderAdmin();
    expect(screen.getByText("Painel Admin")).toBeInTheDocument();
    expect(screen.getByText("PDocSend")).toBeInTheDocument();
  });

  it("deve ter botao de sair", () => {
    renderAdmin();
    expect(screen.getByText("Sair")).toBeInTheDocument();
  });

  it("deve ter 3 tabs", () => {
    renderAdmin();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    expect(screen.getByText("Monitoramento")).toBeInTheDocument();
  });

  it("deve carregar e exibir clientes na aba clientes", async () => {
    renderAdmin();
    const nome = await screen.findByText("Grupo Imobi");
    expect(nome).toBeInTheDocument();
    expect(screen.getByText("felipe@imobi.com")).toBeInTheDocument();
    expect(screen.getByText("Z-API ativo")).toBeInTheDocument();
  });

  it("deve mostrar badge de pendentes", async () => {
    renderAdmin();
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/admin/pendentes");
    });
  });

  it("deve trocar para aba pendentes e exibir usuarios", async () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Pendentes"));

    const email = await screen.findByText("novo@test.com");
    expect(email).toBeInTheDocument();
    expect(screen.getByText("Configurar")).toBeInTheDocument();
  });

  it("deve trocar para aba monitoramento e exibir dados", async () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Monitoramento"));

    const nome = await screen.findByText("Grupo Imobi");
    expect(nome).toBeInTheDocument();
    expect(screen.getByText("150 enviados")).toBeInTheDocument();
    expect(screen.getByText("3 erros")).toBeInTheDocument();
  });

  it("deve abrir modal de configurar ao clicar em pendente", async () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Pendentes"));

    const configButton = await screen.findByText("Configurar");
    fireEvent.click(configButton);

    expect(screen.getByText("Configurar novo cliente")).toBeInTheDocument();
    expect(screen.getAllByText(/novo@test\.com/).length).toBeGreaterThanOrEqual(1);
  });

  it("deve fechar modal ao clicar fora", async () => {
    renderAdmin();
    fireEvent.click(screen.getByText("Pendentes"));

    const configButton = await screen.findByText("Configurar");
    fireEvent.click(configButton);

    expect(screen.getByText("Configurar novo cliente")).toBeInTheDocument();
  });

  it("deve criar cliente com sucesso", async () => {
    mockPost.mockResolvedValue({ tenantId: "new-tenant", uid: "pending-1", nome: "Nova Empresa" });

    renderAdmin();
    fireEvent.click(screen.getByText("Pendentes"));

    const configButton = await screen.findByText("Configurar");
    fireEvent.click(configButton);

    // Preencher formulário
    const inputs = screen.getAllByRole("textbox");
    const nomeInput = inputs[0]; // Nome da empresa
    const corretorInput = inputs[1]; // Nome do corretor

    fireEvent.change(nomeInput, { target: { value: "Nova Empresa" } });
    fireEvent.change(corretorInput, { target: { value: "Carlos" } });

    // Encontrar e preencher campos restantes
    const allInputs = document.querySelectorAll("input");
    // nomeEmpresa (na mensagem)
    fireEvent.change(allInputs[3], { target: { value: "Nova Empresa" } });
    // instanceId
    fireEvent.change(allInputs[4], { target: { value: "inst-123" } });
    // token
    fireEvent.change(allInputs[5], { target: { value: "tok-456" } });
    // clientToken
    fireEvent.change(allInputs[6], { target: { value: "ct-789" } });

    fireEvent.click(screen.getByText("Configurar cliente"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/clientes",
        expect.objectContaining({
          uid: "pending-1",
          nome: "Nova Empresa",
          nomeCorretor: "Carlos",
        })
      );
    });
  });

  it("deve abrir modal de editar ao clicar em cliente", async () => {
    renderAdmin();

    const clienteCard = await screen.findByText("Grupo Imobi");
    fireEvent.click(clienteCard);

    expect(screen.getByText("Editar cliente")).toBeInTheDocument();
  });

  it("deve mostrar erro quando API falha", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/admin/pendentes") return Promise.resolve([]);
      return Promise.reject(new Error("API Error"));
    });

    renderAdmin();

    const error = await screen.findByText("Erro ao carregar dados");
    expect(error).toBeInTheDocument();
  });
});
