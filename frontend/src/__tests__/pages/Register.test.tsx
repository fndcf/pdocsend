/**
 * Testes da tela de Register
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "@/styles/theme";

jest.mock("@/config/firebase", () => ({ auth: {}, db: {} }));

const mockRegister = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: mockRegister,
  }),
}));

import { Register } from "@/pages/Register";

const renderRegister = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <Register />
      </ThemeProvider>
    </MemoryRouter>
  );

describe("Register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve renderizar formulário de registro", () => {
    renderRegister();
    expect(screen.getByText("PDocSend")).toBeInTheDocument();
    expect(screen.getByText("Crie sua conta")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("seu@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Mínimo 6 caracteres")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Repita a senha")).toBeInTheDocument();
  });

  it("deve ter link para login", () => {
    renderRegister();
    expect(screen.getByText("Fazer login")).toBeInTheDocument();
  });

  it("deve mostrar erro quando senhas não conferem", async () => {
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Mínimo 6 caracteres"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repita a senha"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByText("Criar conta"));

    const error = await screen.findByText("As senhas não conferem");
    expect(error).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("deve mostrar erro quando senha é curta", async () => {
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Mínimo 6 caracteres"), {
      target: { value: "123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repita a senha"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByText("Criar conta"));

    const error = await screen.findByText("A senha deve ter pelo menos 6 caracteres");
    expect(error).toBeInTheDocument();
  });

  it("deve mostrar tela de sucesso quando conta aguarda ativação", async () => {
    mockRegister.mockRejectedValue(new Error("Sua conta está aguardando ativação pelo administrador"));
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText("seu@email.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Mínimo 6 caracteres"), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repita a senha"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Criar conta"));

    const success = await screen.findByText("Conta criada com sucesso!");
    expect(success).toBeInTheDocument();
  });
});
