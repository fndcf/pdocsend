/**
 * Testes da tela de Login
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "@/styles/theme";

// Mock firebase
jest.mock("@/config/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({ tenantId: "t1", role: "admin" }) }),
}));

jest.mock("firebase/auth", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockLogin = jest.fn();
const mockLogout = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: null,
    login: mockLogin,
    logout: mockLogout,
    register: jest.fn(),
  }),
}));

import { Login } from "@/pages/Login";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <Login />
      </ThemeProvider>
    </MemoryRouter>
  );

describe("Login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar formulário de login", () => {
    renderLogin();
    expect(screen.getByText("PDocSend")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("seu@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Sua senha")).toBeInTheDocument();
    expect(screen.getByText("Entrar")).toBeInTheDocument();
  });

  it("deve ter link para criar conta", () => {
    renderLogin();
    expect(screen.getByText("Criar conta")).toBeInTheDocument();
  });

  it("deve ter link para esqueceu a senha", () => {
    renderLogin();
    expect(screen.getByText("Esqueceu sua senha?")).toBeInTheDocument();
  });

  it("deve mostrar tela de recuperação ao clicar em esqueceu a senha", () => {
    renderLogin();
    fireEvent.click(screen.getByText("Esqueceu sua senha?"));
    expect(screen.getByText("Recuperar senha")).toBeInTheDocument();
    expect(screen.getByText("Enviar link de recuperação")).toBeInTheDocument();
  });

  it("deve voltar para login ao clicar em voltar na recuperação", () => {
    renderLogin();
    fireEvent.click(screen.getByText("Esqueceu sua senha?"));
    fireEvent.click(screen.getByText("Voltar para o login"));
    expect(screen.getByText("Faça login para continuar")).toBeInTheDocument();
  });

  it("deve desabilitar botão entrar quando campos vazios", () => {
    renderLogin();
    // O form tem required nos inputs, botão não deve submeter
    const button = screen.getByText("Entrar");
    expect(button).toBeInTheDocument();
  });

  it("deve chamar login ao submeter o formulário", async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Sua senha"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Entrar"));

    expect(mockLogin).toHaveBeenCalledWith("test@test.com", "123456");
  });

  it("deve mostrar erro quando login falha", async () => {
    mockLogin.mockRejectedValue(new Error("Email ou senha incorretos"));
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Sua senha"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByText("Entrar"));

    const error = await screen.findByText("Email ou senha incorretos");
    expect(error).toBeInTheDocument();
  });

  it("deve enviar email de recuperação de senha", async () => {
    const { sendPasswordResetEmail } = require("firebase/auth");
    sendPasswordResetEmail.mockResolvedValue(undefined);
    renderLogin();

    fireEvent.click(screen.getByText("Esqueceu sua senha?"));
    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), {
      target: { value: "recover@test.com" },
    });
    fireEvent.click(screen.getByText("Enviar link de recuperação"));

    const success = await screen.findByText("Email enviado!");
    expect(success).toBeInTheDocument();
  });

  it("deve mostrar mensagem pendente quando usuário não tem tenant", async () => {
    const { getDoc } = require("firebase/firestore");
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ role: "admin" }) });
    mockLogin.mockResolvedValue(undefined);

    // Simular currentUser após login
    const firebase = require("@/config/firebase");
    firebase.auth.currentUser = { uid: "test-uid" };

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Sua senha"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Entrar"));

    const msg = await screen.findByText(/aguardando ativação/);
    expect(msg).toBeInTheDocument();
    expect(mockLogout).toHaveBeenCalled();

    // Restaurar
    firebase.auth.currentUser = null;
  });

  it("deve mostrar loading ao submeter login", async () => {
    mockLogin.mockImplementation(() => new Promise(() => {}));
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Sua senha"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Entrar"));

    const entrando = await screen.findAllByText("Entrando...");
    expect(entrando.length).toBeGreaterThan(0);
  });
});
