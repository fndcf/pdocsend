import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "@/styles/theme";

// Mock Firebase
jest.mock("@/config/firebase", () => ({
  auth: {
    currentUser: { uid: "test-uid", getIdToken: jest.fn().mockResolvedValue("test-token") },
    onAuthStateChanged: jest.fn((callback: (user: unknown) => void) => {
      callback({ uid: "test-uid", email: "test@test.com" });
      return jest.fn();
    }),
  },
  db: {},
}));

// Mock AuthContext
jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "test@test.com" },
    loading: false,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useTenant
jest.mock("@/hooks/useTenant", () => ({
  useTenant: () => ({
    tenantId: "test-tenant",
    role: "admin",
    isSuperAdmin: false,
    loading: false,
    error: null,
  }),
}));

// Mock apiClient
jest.mock("@/services/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    upload: jest.fn(),
  },
}));

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <QueryClientProvider client={testQueryClient}>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { screen, fireEvent, waitFor, act } from "@testing-library/react";
