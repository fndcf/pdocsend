import { renderHook, waitFor } from "@testing-library/react";

// Mock Firebase
const mockOnSnapshot = jest.fn();
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

jest.mock("@/config/firebase", () => ({
  db: {},
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "user-123", email: "test@test.com" },
    loading: false,
  }),
}));

import { useTenant } from "@/hooks/useTenant";

describe("useTenant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar loading inicialmente", () => {
    mockOnSnapshot.mockImplementation(() => jest.fn());

    const { result } = renderHook(() => useTenant());

    expect(result.current.loading).toBe(true);
    expect(result.current.tenantId).toBeNull();
  });

  it("deve retornar tenantId e role quando doc existe", async () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, callback: (snap: unknown) => void) => {
      callback({
        exists: () => true,
        data: () => ({ tenantId: "tenant-1", role: "admin" }),
      });
      return jest.fn();
    });

    const { result } = renderHook(() => useTenant());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tenantId).toBe("tenant-1");
    expect(result.current.role).toBe("admin");
    expect(result.current.isSuperAdmin).toBe(false);
  });

  it("deve identificar superadmin", async () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, callback: (snap: unknown) => void) => {
      callback({
        exists: () => true,
        data: () => ({ tenantId: "", role: "superadmin" }),
      });
      return jest.fn();
    });

    const { result } = renderHook(() => useTenant());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.tenantId).toBeNull();
  });

  it("deve retornar erro quando usuario nao tem tenant", async () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, callback: (snap: unknown) => void) => {
      callback({
        exists: () => true,
        data: () => ({ tenantId: "", role: "admin" }),
      });
      return jest.fn();
    });

    const { result } = renderHook(() => useTenant());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain("não foi vinculada");
  });

  it("deve retornar erro quando doc nao existe", async () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, callback: (snap: unknown) => void) => {
      callback({
        exists: () => false,
      });
      return jest.fn();
    });

    const { result } = renderHook(() => useTenant());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain("não foi configurada");
  });
});
