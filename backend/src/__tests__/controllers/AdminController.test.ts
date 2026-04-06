jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock("../../utils/crypto", () => ({
  encrypt: (val: string) => val,
  decrypt: (val: string) => val,
}));

const mockListarPaginado = jest.fn();
const mockBuscarPorId = jest.fn();
const mockCriar = jest.fn();
const mockAtualizar = jest.fn();

jest.mock("../../repositories/TenantRepository", () => ({
  __esModule: true,
  default: {
    listarPaginado: mockListarPaginado,
    buscarPorId: mockBuscarPorId,
    criar: mockCriar,
    atualizar: mockAtualizar,
  },
}));

const mockListarPorTenant = jest.fn();
const mockListarPendentesIds = jest.fn();
const mockCriarUser = jest.fn();

jest.mock("../../repositories/UserRepository", () => ({
  __esModule: true,
  default: {
    listarPorTenant: mockListarPorTenant,
    listarPendentesIds: mockListarPendentesIds,
    criar: mockCriarUser,
  },
}));

const mockListarRecentes = jest.fn();

jest.mock("../../repositories/LoteRepository", () => ({
  __esModule: true,
  default: {
    listarRecentes: mockListarRecentes,
  },
}));

const mockLimparAntigos = jest.fn();

jest.mock("../../repositories/ImovelEnviadoRepository", () => ({
  __esModule: true,
  default: {
    limparAntigos: mockLimparAntigos,
  },
}));

const mockGetUser = jest.fn();
const mockListUsers = jest.fn();

jest.mock("../../config/firebase", () => ({
  db: {},
  auth: {
    getUser: (...args: unknown[]) => mockGetUser(...args),
    listUsers: (...args: unknown[]) => mockListUsers(...args),
  },
}));

jest.mock("../../middlewares/auth", () => ({
  ...jest.requireActual("../../middlewares/auth"),
  invalidateUserCache: jest.fn(),
}));

import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth";
import adminController from "../../controllers/AdminController";

describe("AdminController", () => {
  const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const baseUser = { uid: "admin-1", email: "admin@test.com", tenantId: "", role: "superadmin" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listarClientes", () => {
    it("deve retornar lista de clientes com usuarios (paginado)", async () => {
      mockListarPaginado.mockResolvedValue({
        items: [
          {
            id: "t1",
            nome: "Empresa A",
            zapiInstanceId: "inst-1",
            limiteDiario: 200,
            mensagemTemplate: { nomeCorretor: "Carlos", nomeEmpresa: "A", cargo: "corretor" },
            criadoEm: { seconds: 1700000000 },
          },
        ],
        hasMore: false,
        nextCursor: undefined,
      });
      mockListarPorTenant.mockResolvedValue({
        t1: [{ uid: "u1", email: "carlos@a.com", nome: "Carlos", role: "admin" }],
      });

      const req = { user: baseUser, query: {} } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.listarClientes(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(responseData.clientes).toHaveLength(1);
      expect(responseData.clientes[0].nome).toBe("Empresa A");
      expect(responseData.clientes[0].zapiInstanceId).toBe("***configurado***");
      expect(responseData.clientes[0].usuarios).toHaveLength(1);
      expect(responseData.hasMore).toBe(false);
    });

    it("deve retornar lista vazia quando nao ha tenants", async () => {
      mockListarPaginado.mockResolvedValue({
        items: [],
        hasMore: false,
        nextCursor: undefined,
      });
      mockListarPorTenant.mockResolvedValue({});

      const req = { user: baseUser, query: {} } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.listarClientes(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(responseData.clientes).toHaveLength(0);
    });

    it("deve retornar 500 em caso de erro", async () => {
      mockListarPaginado.mockRejectedValue(new Error("DB error"));

      const req = { user: baseUser, query: {} } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.listarClientes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("listarPendentes", () => {
    it("deve retornar usuarios sem tenant", async () => {
      mockListUsers.mockResolvedValue({
        users: [
          { uid: "u1", email: "novo@test.com", metadata: { creationTime: "2026-01-01" } },
          { uid: "u2", email: "admin@test.com", metadata: { creationTime: "2026-01-01" } },
        ],
      });
      mockListarPendentesIds.mockResolvedValue(
        new Map([["u2", { tenantId: "t1", role: "admin" }]])
      );

      const req = { user: baseUser } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.listarPendentes(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data).toHaveLength(1);
      expect(data[0].email).toBe("novo@test.com");
    });

    it("deve excluir superadmins da lista de pendentes", async () => {
      mockListUsers.mockResolvedValue({
        users: [
          { uid: "sa1", email: "super@test.com", metadata: { creationTime: "2026-01-01" } },
        ],
      });
      mockListarPendentesIds.mockResolvedValue(
        new Map([["sa1", { tenantId: "", role: "superadmin" }]])
      );

      const req = { user: baseUser } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.listarPendentes(req, res);

      const data = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(data).toHaveLength(0);
    });
  });

  describe("criarCliente", () => {
    it("deve criar tenant e vincular usuario", async () => {
      mockGetUser.mockResolvedValue({ uid: "u1", email: "novo@test.com" });
      mockCriar.mockResolvedValue("new-tenant-id");
      mockCriarUser.mockResolvedValue(undefined);

      const req = {
        user: baseUser,
        body: {
          uid: "u1",
          nome: "Nova Empresa",
          nomeCorretor: "João",
          nomeEmpresa: "Nova",
          cargo: "corretor",
          zapiInstanceId: "inst-1",
          zapiToken: "tok-1",
          zapiClientToken: "ct-1",
          limiteDiario: 200,
        },
      } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.criarCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockCriar).toHaveBeenCalledWith(
        expect.objectContaining({ nome: "Nova Empresa", zapiInstanceId: "inst-1" })
      );
      expect(mockCriarUser).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ tenantId: "new-tenant-id", role: "admin" })
      );
    });

    it("deve retornar 404 quando usuario nao existe no Firebase Auth", async () => {
      mockGetUser.mockRejectedValue(new Error("User not found"));

      const req = {
        user: baseUser,
        body: {
          uid: "inexistente",
          nome: "Teste",
          nomeCorretor: "X",
          nomeEmpresa: "Y",
          zapiInstanceId: "i",
          zapiToken: "t",
          zapiClientToken: "c",
        },
      } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.criarCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("editarCliente", () => {
    it("deve atualizar tenant com sucesso", async () => {
      mockBuscarPorId.mockResolvedValue({
        id: "t1",
        nome: "Empresa A",
        mensagemTemplate: { nomeCorretor: "Carlos", nomeEmpresa: "A", cargo: "corretor" },
      });
      mockAtualizar.mockResolvedValue(undefined);

      const req = {
        user: baseUser,
        params: { id: "t1" },
        body: { nome: "Empresa B", nomeCorretor: "Pedro" },
      } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.editarCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockAtualizar).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          nome: "Empresa B",
          mensagemTemplate: expect.objectContaining({ nomeCorretor: "Pedro" }),
        })
      );
    });

    it("deve retornar 404 quando tenant nao existe", async () => {
      mockBuscarPorId.mockResolvedValue(null);

      const req = {
        user: baseUser,
        params: { id: "inexistente" },
        body: { nome: "X" },
      } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.editarCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("monitoramento", () => {
    it("deve retornar stats paginados dos tenants", async () => {
      mockListarPaginado.mockResolvedValue({
        items: [
          {
            id: "t1",
            nome: "Empresa A",
            mensagemTemplate: { nomeCorretor: "Carlos" },
          },
        ],
        hasMore: false,
        nextCursor: undefined,
      });
      mockListarRecentes.mockResolvedValue([
        {
          id: "lote-1",
          pdfOrigem: "test.pdf",
          totalEnvios: 10,
          enviados: 8,
          erros: 2,
          status: "finalizado",
          criadoEm: { seconds: 1700000000 },
        },
      ]);

      const req = { user: baseUser, query: {} } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.monitoramento(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(responseData.stats).toHaveLength(1);
      expect(responseData.stats[0].totalEnviados).toBe(8);
      expect(responseData.stats[0].totalErros).toBe(2);
      expect(responseData.stats[0].lotesRecentes).toHaveLength(1);
      expect(responseData.hasMore).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("deve limpar registros antigos paginando tenants", async () => {
      mockListarPaginado.mockResolvedValueOnce({
        items: [{ id: "t1", nome: "A" }],
        hasMore: false,
        nextCursor: undefined,
      });
      mockLimparAntigos.mockResolvedValue(5);

      const req = {
        user: baseUser,
        body: { meses: "6" },
      } as unknown as AuthRequest;
      const res = mockRes();

      await adminController.cleanup(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockLimparAntigos).toHaveBeenCalledWith("t1", expect.anything());
      const responseData = (res.json as jest.Mock).mock.calls[0][0].data;
      expect(responseData.totalRemovidos).toBe(5);
    });
  });
});
