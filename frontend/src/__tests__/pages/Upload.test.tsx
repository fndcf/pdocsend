/**
 * Testes da tela de Upload
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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

jest.mock("@/services/apiClient", () => ({
  __esModule: true,
  default: {
    upload: jest.fn(),
    get: jest.fn().mockResolvedValue({
      enviadosHoje: 5,
      limiteDiario: 200,
      enviadosMes: 42,
      errosMes: 1,
      totalPdfs: 3,
      ultimoEnvio: { seconds: 1743550000 },
    }),
  },
}));

jest.mock("@/components/TenantGuard", () => ({
  TenantGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Upload } from "@/pages/Upload";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderUpload = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <Upload />
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

describe("Upload", () => {
  it("deve renderizar tela de upload", () => {
    renderUpload();
    expect(screen.getAllByText(/Processar arquivo/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Arraste o arquivo aqui ou clique para selecionar")).toBeInTheDocument();
  });

  it("deve ter botão de histórico", () => {
    renderUpload();
    expect(screen.getByText("Histórico")).toBeInTheDocument();
  });

  it("deve ter botão de sair", () => {
    renderUpload();
    expect(screen.getByText("Sair")).toBeInTheDocument();
  });

  it("deve ter botão de processar desabilitado sem arquivo", () => {
    renderUpload();
    const button = screen.getByRole("button", { name: /processar arquivo/i });
    expect(button).toBeDisabled();
  });

  it("deve mostrar erro para arquivo inválido (txt)", () => {
    renderUpload();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("Formato inválido. Envie um arquivo PDF ou Excel (.xlsx).")).toBeInTheDocument();
  });

  it("deve aceitar arquivo PDF e habilitar botão", () => {
    renderUpload();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("test.pdf")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /processar arquivo/i });
    expect(button).not.toBeDisabled();
  });

  it("deve aceitar arquivo Excel (.xlsx) e habilitar botão", () => {
    renderUpload();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "lista.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("lista.xlsx")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /processar arquivo/i });
    expect(button).not.toBeDisabled();
  });

  it("deve mostrar loading ao processar arquivo", async () => {
    const apiClient = require("@/services/apiClient").default;
    apiClient.upload.mockImplementation(() => new Promise(() => {})); // never resolves

    renderUpload();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /processar arquivo/i }));

    expect(await screen.findByText("Processando arquivo...")).toBeInTheDocument();
  });

  it("deve mostrar erro 500 amigável", async () => {
    const apiClient = require("@/services/apiClient").default;
    apiClient.upload.mockRejectedValue(new Error("Request failed with status code 500"));

    renderUpload();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /processar arquivo/i }));

    expect(await screen.findByText("Erro interno do servidor. Tente novamente em alguns instantes.")).toBeInTheDocument();
  });

  it("deve mostrar erro de rede", async () => {
    const apiClient = require("@/services/apiClient").default;
    apiClient.upload.mockRejectedValue(new Error("Network Error"));

    renderUpload();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /processar arquivo/i }));

    expect(await screen.findByText("Erro de conexão. Verifique sua internet e tente novamente.")).toBeInTheDocument();
  });

  it("deve aceitar drop de arquivo PDF", () => {
    renderUpload();
    const dropZone = screen.getByText("Arraste o arquivo aqui ou clique para selecionar").closest("div")!;
    const file = new File(["test"], "dropped.pdf", { type: "application/pdf" });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText("dropped.pdf")).toBeInTheDocument();
  });

  it("deve aceitar drop de arquivo Excel", () => {
    renderUpload();
    const dropZone = screen.getByText("Arraste o arquivo aqui ou clique para selecionar").closest("div")!;
    const file = new File(["test"], "lista.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText("lista.xlsx")).toBeInTheDocument();
  });

  it("deve rejeitar drop de arquivo inválido", () => {
    renderUpload();
    const dropZone = screen.getByText("Arraste o arquivo aqui ou clique para selecionar").closest("div")!;
    const file = new File(["test"], "test.docx", { type: "application/msword" });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText("Formato inválido. Envie um arquivo PDF ou Excel (.xlsx).")).toBeInTheDocument();
  });
});
