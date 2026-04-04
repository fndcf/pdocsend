/**
 * Testes da tela de Revisão
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
    user: { uid: "test-uid", email: "test@test.com" },
    loading: false,
    logout: jest.fn(),
  }),
}));

jest.mock("@/hooks/useTenant", () => ({
  useTenant: () => ({
    tenantId: "test-tenant",
    role: "admin",
    isSuperAdmin: false,
    loading: false,
    error: null,
  }),
}));

const mockPost = jest.fn();
jest.mock("@/services/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: mockPost,
    put: jest.fn(),
    upload: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
const mockLocationState = {
  contatos: [
    {
      nome: "Maria Silva",
      telefone: "5511999001122",
      imoveis: [
        {
          edificio: "Solar Park",
          endereco: "Rua Teste",
          numero: "100",
          apartamento: "301",
          operacao: "venda" as const,
          valorVenda: "R$ 500.000",
          valorLocacao: "",
        },
      ],
      status: "novo" as const,
      hashesNovos: ["hash1"],
      hashesExistentes: [],
      mensagemPreview: "Bom dia Maria, tudo bem?",
    },
    {
      nome: "João Santos",
      telefone: "5511999003344",
      imoveis: [
        {
          edificio: "Landing Home",
          endereco: "Av Central",
          numero: "200",
          apartamento: "102",
          operacao: "locacao" as const,
          valorVenda: "",
          valorLocacao: "R$ 3.000",
        },
      ],
      status: "ja_enviado" as const,
      hashesNovos: [],
      hashesExistentes: ["hash2"],
    },
  ],
  resumo: {
    totalImoveisNoPdf: 5,
    totalImoveis: 3,
    totalContatos: 2,
    novos: 1,
    jaEnviados: 1,
  },
  pdfOrigem: "campo_belo.pdf",
};

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState }),
}));

import { Revisao } from "@/pages/Revisao";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderRevisao = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <Revisao />
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

describe("Revisao", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it("deve renderizar header com nome do PDF", () => {
    renderRevisao();
    expect(screen.getByText(/campo_belo\.pdf/)).toBeInTheDocument();
  });

  it("deve mostrar resumo com totais", () => {
    renderRevisao();
    expect(screen.getByText("5")).toBeInTheDocument(); // totalImoveisNoPdf
    expect(screen.getByText("3")).toBeInTheDocument(); // totalImoveis
    expect(screen.getByText("Imóveis no PDF")).toBeInTheDocument();
  });

  it("deve exibir contato novo", () => {
    renderRevisao();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("5511999001122")).toBeInTheDocument();
  });

  it("deve exibir contato ja enviado", () => {
    renderRevisao();
    expect(screen.getByText("João Santos")).toBeInTheDocument();
  });

  it("deve exibir secao de novos e ja enviados", () => {
    renderRevisao();
    expect(screen.getByText(/Novos \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Já enviados \(1\)/)).toBeInTheDocument();
  });

  it("deve exibir tags de operacao nos imoveis", () => {
    renderRevisao();
    expect(screen.getByText("V")).toBeInTheDocument(); // venda tag
  });

  it("deve abrir preview da mensagem ao clicar no icone de olho", () => {
    renderRevisao();
    const eyeButtons = screen.getAllByTitle("Ver mensagem");
    fireEvent.click(eyeButtons[0]);
    expect(screen.getByText("Bom dia Maria, tudo bem?")).toBeInTheDocument();
  });

  it("deve abrir modal de confirmacao ao remover contato", () => {
    renderRevisao();
    const removeButtons = screen.getAllByTitle("Remover");
    fireEvent.click(removeButtons[0]);
    expect(screen.getByText("Remover contato")).toBeInTheDocument();
    expect(screen.getByText(/Tem certeza que deseja remover/)).toBeInTheDocument();
  });

  it("deve fechar modal ao cancelar remocao", () => {
    renderRevisao();
    const removeButtons = screen.getAllByTitle("Remover");
    fireEvent.click(removeButtons[0]);
    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.queryByText("Remover contato")).not.toBeInTheDocument();
  });

  it("deve remover contato ao confirmar", () => {
    renderRevisao();
    const removeButtons = screen.getAllByTitle("Remover");
    fireEvent.click(removeButtons[0]);
    // Dentro do modal, pegar o botão "Remover" que está junto do ícone trash
    const modalRemoveButtons = screen.getAllByRole("button", { name: /Remover/i });
    // O último é o do modal (com texto "Remover")
    fireEvent.click(modalRemoveButtons[modalRemoveButtons.length - 1]);
    expect(screen.queryByText("Maria Silva")).not.toBeInTheDocument();
  });

  it("deve permitir editar nome do contato", () => {
    renderRevisao();
    const editButtons = screen.getAllByTitle("Editar nome");
    fireEvent.click(editButtons[0]);

    const input = screen.getByDisplayValue("Maria Silva");
    fireEvent.change(input, { target: { value: "Maria Souza" } });

    const saveButton = screen.getByTitle("Salvar");
    fireEvent.click(saveButton);

    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
  });

  it("deve cancelar edicao de nome", () => {
    renderRevisao();
    const editButtons = screen.getAllByTitle("Editar nome");
    fireEvent.click(editButtons[0]);

    const cancelButton = screen.getByTitle("Cancelar");
    fireEvent.click(cancelButton);

    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
  });

  it("deve confirmar envio e navegar para pagina de envio", async () => {
    mockPost.mockResolvedValue({ loteId: "lote-123" });
    renderRevisao();

    fireEvent.click(screen.getByText(/Confirmar envio de 1 mensagem/));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/envios/confirmar", {
        contatos: expect.arrayContaining([
          expect.objectContaining({ nome: "Maria Silva", status: "novo" }),
        ]),
        pdfOrigem: "campo_belo.pdf",
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/envio/lote-123");
    });
  });

  it("deve limpar sessionStorage apos confirmar envio", async () => {
    sessionStorage.setItem("revisaoData", "test");
    mockPost.mockResolvedValue({ loteId: "lote-123" });
    renderRevisao();

    fireEvent.click(screen.getByText(/Confirmar envio de 1 mensagem/));

    await waitFor(() => {
      expect(sessionStorage.getItem("revisaoData")).toBeNull();
    });
  });

  it("deve mostrar erro quando confirmacao falha", async () => {
    mockPost.mockRejectedValue({
      response: { data: { error: "Limite diário atingido" } },
    });
    renderRevisao();

    fireEvent.click(screen.getByText(/Confirmar envio de 1 mensagem/));

    const error = await screen.findByText("Limite diário atingido");
    expect(error).toBeInTheDocument();
  });

  it("deve desabilitar botao quando nao ha contatos novos", () => {
    // Remove o contato novo
    renderRevisao();
    const removeButtons = screen.getAllByTitle("Remover");
    fireEvent.click(removeButtons[0]);
    const modalRemoveButtons = screen.getAllByRole("button", { name: /Remover/i });
    fireEvent.click(modalRemoveButtons[modalRemoveButtons.length - 1]);

    const confirmButton = screen.getByText(/Confirmar envio de 0 mensagem/);
    expect(confirmButton).toBeDisabled();
  });
});
