/**
 * Testes da tela de Envio (progresso de envio em tempo real)
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "@/styles/theme";

// Mock Firestore onSnapshot
const mockLoteData = {
  totalEnvios: 3,
  enviados: 1,
  erros: 1,
  status: "em_andamento",
  pdfOrigem: "imoveis_teste.pdf",
  criadoEm: { seconds: 1743550000 },
  finalizadoEm: null,
};

const mockEnviosData = [
  {
    id: "envio-1",
    telefone: "5511999001122",
    nome: "Maria",
    nomeContato: "Maria - Solar Park (Apt 301)",
    status: "enviado",
    erro: "",
    enviadoEm: { seconds: 1743550100 },
    criadoEm: { seconds: 1743550000 },
  },
  {
    id: "envio-2",
    telefone: "5511999003344",
    nome: "João",
    nomeContato: "João - Landing Home (Apt 102)",
    status: "erro",
    erro: "Z-API timeout",
    enviadoEm: null,
    criadoEm: { seconds: 1743550001 },
  },
  {
    id: "envio-3",
    telefone: "5511999005566",
    nome: "Ana",
    nomeContato: "Ana - Central Park (Apt 501)",
    status: "pendente",
    erro: "",
    enviadoEm: null,
    criadoEm: { seconds: 1743550002 },
  },
];

jest.mock("@/config/firebase", () => ({
  auth: { currentUser: { uid: "test-uid", getIdToken: jest.fn().mockResolvedValue("token") } },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  onSnapshot: jest.fn((_, callback) => {
    // Distinguish between lote and envios based on call order
    if (callback.toString().includes("snap")) {
      // Called for both lote and envios
    }
    return jest.fn(); // unsubscribe
  }),
  query: jest.fn(),
  orderBy: jest.fn(),
}));

// Mock useLoteProgress directly for simpler testing
jest.mock("@/hooks/useLoteProgress", () => ({
  useLoteProgress: () => ({
    lote: mockLoteData,
    loteNotFound: false,
    envios: mockEnviosData,
    progresso: 67,
    finalizado: false,
    cancelados: 0,
    pendentes: 1,
  }),
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

jest.mock("@/services/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    upload: jest.fn(),
  },
}));

jest.mock("@/components/TenantGuard", () => ({
  TenantGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Envio } from "@/pages/Envio";

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderEnvio = () =>
  render(
    <MemoryRouter initialEntries={["/envio/lote-123"]}>
      <QueryClientProvider client={testQueryClient}>
        <ThemeProvider theme={theme}>
          <Routes>
            <Route path="/envio/:loteId" element={<Envio />} />
          </Routes>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

describe("Envio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar header com nome do PDF", () => {
    renderEnvio();
    expect(screen.getByText(/imoveis_teste\.pdf/)).toBeInTheDocument();
  });

  it("deve mostrar porcentagem de progresso", () => {
    renderEnvio();
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("deve mostrar contagem de enviados", () => {
    renderEnvio();
    expect(screen.getByText(/1 enviado\(s\)/)).toBeInTheDocument();
  });

  it("deve mostrar contagem de erros", () => {
    renderEnvio();
    expect(screen.getByText(/1 erro\(s\)/)).toBeInTheDocument();
  });

  it("deve mostrar contagem de pendentes", () => {
    renderEnvio();
    expect(screen.getByText(/1 pendente\(s\)/)).toBeInTheDocument();
  });

  it("deve exibir lista de envios com nomes dos contatos", () => {
    renderEnvio();
    expect(screen.getByText("Maria - Solar Park (Apt 301)")).toBeInTheDocument();
    expect(screen.getByText("João - Landing Home (Apt 102)")).toBeInTheDocument();
    expect(screen.getByText("Ana - Central Park (Apt 501)")).toBeInTheDocument();
  });

  it("deve mostrar status badge para cada envio", () => {
    renderEnvio();
    expect(screen.getByText("Enviado")).toBeInTheDocument();
    expect(screen.getByText("Erro")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });

  it("deve mostrar mensagem de erro do envio com falha", () => {
    renderEnvio();
    expect(screen.getByText("Z-API timeout")).toBeInTheDocument();
  });

  it("deve mostrar botao de cancelar envio quando em andamento", () => {
    renderEnvio();
    expect(screen.getByText("Cancelar envio")).toBeInTheDocument();
  });

  it("deve mostrar botao de cancelar individual para envios pendentes", () => {
    renderEnvio();
    const cancelButtons = screen.getAllByTitle("Cancelar este envio");
    expect(cancelButtons).toHaveLength(1); // Apenas o pendente
  });

  it("deve mostrar titulo de envio em andamento", () => {
    renderEnvio();
    expect(screen.getByText(/Enviando 2\/3/)).toBeInTheDocument();
  });
});

describe("Envio - Finalizado", () => {
  beforeEach(() => {
    const hook = require("@/hooks/useLoteProgress");
    hook.useLoteProgress = () => ({
      lote: { ...mockLoteData, status: "finalizado", enviados: 2, erros: 1 },
      loteNotFound: false,
      envios: mockEnviosData.map((e) =>
        e.status === "pendente" ? { ...e, status: "enviado" } : e
      ),
      progresso: 100,
      finalizado: true,
      cancelados: 0,
      pendentes: 0,
    });
  });

  it("deve mostrar titulo de envio finalizado", () => {
    renderEnvio();
    expect(screen.getByText("Envio finalizado")).toBeInTheDocument();
  });

  it("deve mostrar 100%", () => {
    renderEnvio();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("nao deve mostrar botao de cancelar quando finalizado", () => {
    renderEnvio();
    expect(screen.queryByText("Cancelar envio")).not.toBeInTheDocument();
  });
});
