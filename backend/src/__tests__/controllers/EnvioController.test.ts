jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockDocGet = jest.fn();
const mockDocSet = jest.fn().mockResolvedValue(undefined);
const mockDocUpdate = jest.fn().mockResolvedValue(undefined);
const mockCollectionGet = jest.fn();
const mockCollectionDoc = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockWhere = jest.fn();

jest.mock("../../config/firebase", () => ({
  db: {
    collection: jest.fn(() => ({
      doc: mockCollectionDoc.mockReturnValue({
        id: "doc-123",
        get: mockDocGet,
        set: mockDocSet,
        update: mockDocUpdate,
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            id: "envio-123",
            set: mockDocSet,
            get: mockDocGet,
            update: mockDocUpdate,
          })),
        })),
      }),
      orderBy: jest.fn(() => ({
        desc: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: mockCollectionGet.mockResolvedValue({ docs: [] }),
          })),
        })),
        limit: jest.fn(() => ({
          get: mockCollectionGet.mockResolvedValue({ docs: [] }),
        })),
        get: mockCollectionGet.mockResolvedValue({ docs: [] }),
      })),
      where: mockWhere.mockReturnValue({
        get: mockCollectionGet.mockResolvedValue({ docs: [], empty: true }),
        where: jest.fn(() => ({
          get: mockCollectionGet,
        })),
      }),
      get: mockCollectionGet,
    })),
    batch: jest.fn(() => ({
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    })),
  },
  auth: {},
}));

jest.mock("../../services/MessageBuilderService", () => ({
  __esModule: true,
  default: {
    montarNomeContato: jest.fn(() => "Contato Teste"),
    montarMensagemPreview: jest.fn(() => "Mensagem preview"),
  },
}));

jest.mock("../../services/FilaEnvioService", () => ({
  __esModule: true,
  default: {
    criarTasks: jest.fn().mockResolvedValue(undefined),
  },
}));

import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth";
import envioController from "../../controllers/EnvioController";

describe("EnvioController", () => {
  const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const baseUser = { uid: "user-1", email: "test@test.com", tenantId: "tenant-1", role: "admin" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("confirmar", () => {
    it("deve retornar 400 quando não há contatos novos", async () => {
      const req = {
        user: baseUser,
        body: { contatos: [], pdfOrigem: "test.pdf" },
      } as unknown as AuthRequest;
      const res = mockRes();

      await envioController.confirmar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar 400 quando tenant não existe", async () => {
      const req = {
        user: baseUser,
        body: {
          contatos: [{ status: "novo", nome: "Teste", telefone: "123", imoveis: [] }],
          pdfOrigem: "test.pdf",
        },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockDocGet.mockResolvedValue({ exists: false, data: () => null });

      await envioController.confirmar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve criar lote e envios com sucesso", async () => {
      const req = {
        user: baseUser,
        body: {
          contatos: [
            { status: "novo", nome: "Teste", telefone: "123", imoveis: [{ edificio: "Ed A" }] },
          ],
          pdfOrigem: "test.pdf",
        },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          mensagemTemplate: { nomeCorretor: "Felipe", nomeEmpresa: "Imobi", cargo: "corretor" },
        }),
      });

      await envioController.confirmar(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockDocSet).toHaveBeenCalled();
    });
  });

  describe("listarLotes", () => {
    it("deve retornar lista vazia", async () => {
      const req = { user: baseUser } as unknown as AuthRequest;
      const res = mockRes();

      await envioController.listarLotes(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("detalhesLote", () => {
    it("deve retornar 404 quando lote não existe", async () => {
      const req = {
        user: baseUser,
        params: { id: "lote-inexistente" },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockDocGet.mockResolvedValue({ exists: false });

      await envioController.detalhesLote(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar detalhes do lote com envios", async () => {
      const req = {
        user: baseUser,
        params: { id: "lote-1" },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockDocGet.mockResolvedValue({
        exists: true,
        id: "lote-1",
        data: () => ({ totalEnvios: 2, enviados: 1, erros: 0, status: "em_andamento" }),
      });

      await envioController.detalhesLote(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("cancelarLote", () => {
    it("deve retornar 404 quando lote não existe", async () => {
      const req = {
        user: baseUser,
        params: { id: "lote-1" },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockDocGet.mockResolvedValue({ exists: false });

      await envioController.cancelarLote(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 400 quando lote não está em andamento", async () => {
      const req = {
        user: baseUser,
        params: { id: "lote-1" },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "finalizado" }),
      });

      await envioController.cancelarLote(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve cancelar lote com sucesso", async () => {
      const req = {
        user: baseUser,
        params: { id: "lote-1" },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "em_andamento" }),
      });
      mockCollectionGet.mockResolvedValue({
        docs: [
          { ref: { update: jest.fn() }, data: () => ({ status: "pendente" }) },
        ],
      });

      await envioController.cancelarLote(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("cancelarEnvio", () => {
    it("deve retornar 404 quando envio não existe", async () => {
      const req = {
        user: baseUser,
        params: { id: "lote-1", envioId: "envio-1" },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockDocGet.mockResolvedValue({ exists: false });

      await envioController.cancelarEnvio(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 400 quando envio não está pendente", async () => {
      const req = {
        user: baseUser,
        params: { id: "lote-1", envioId: "envio-1" },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ status: "enviado" }),
      });

      await envioController.cancelarEnvio(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve cancelar envio pendente com sucesso", async () => {
      const req = {
        user: baseUser,
        params: { id: "lote-1", envioId: "envio-1" },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockDocGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ status: "pendente" }) }) // envio
        .mockResolvedValueOnce({ exists: true, data: () => ({ totalEnvios: 2 }) }); // lote

      mockCollectionGet.mockResolvedValue({
        docs: [
          { data: () => ({ status: "enviado" }) },
          { data: () => ({ status: "cancelado" }) },
        ],
      });

      await envioController.cancelarEnvio(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockDocUpdate).toHaveBeenCalled();
    });
  });

  describe("historicoPorContato", () => {
    it("deve retornar vazio quando não há envios", async () => {
      const req = {
        user: baseUser,
        params: { telefone: "5511990018181" },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockCollectionGet.mockResolvedValue({ empty: true, docs: [] });

      await envioController.historicoPorContato(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deve retornar envios quando existem", async () => {
      const req = {
        user: baseUser,
        params: { telefone: "5511990018181" },
      } as unknown as AuthRequest;
      const res = mockRes();

      mockCollectionGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "hash-1",
            data: () => ({
              telefone: "5511990018181",
              edificio: "Landing Home",
              loteId: "lote-1",
            }),
          },
        ],
      });

      mockDocGet.mockResolvedValue({
        exists: true,
        id: "lote-1",
        data: () => ({ pdfOrigem: "test.pdf" }),
      });

      await envioController.historicoPorContato(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
