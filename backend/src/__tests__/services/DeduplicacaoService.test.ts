jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockCommit = jest.fn().mockResolvedValue(undefined);

jest.mock("../../config/firebase", () => ({
  db: {
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        get: mockGet,
      })),
      doc: jest.fn(() => ({
        id: "mock-doc-id",
      })),
    })),
    batch: jest.fn(() => ({
      set: mockSet,
      commit: mockCommit,
    })),
  },
}));

import deduplicacaoService from "../../services/DeduplicacaoService";
import { Contato } from "../../models/Imovel";

describe("DeduplicacaoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verificar", () => {
    it("deve marcar todos como novos quando não há histórico", async () => {
      mockGet.mockResolvedValue({ docs: [] });

      const contatos: Contato[] = [
        {
          nome: "Denise",
          telefone: "5511990018181",
          imoveis: [
            {
              edificio: "Landing Home",
              endereco: "VIEIRA DE MORAIS",
              numero: "1936",
              apartamento: "303",
              operacao: "venda",
              valorVenda: "R$970.000,00",
              valorLocacao: "",
            },
          ],
        },
      ];

      const resultado = await deduplicacaoService.verificar("tenant-1", contatos);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].status).toBe("novo");
      expect(resultado[0].hashesNovos.length).toBe(1);
    });

    it("deve marcar como já enviado quando hash existe no histórico", async () => {
      mockGet.mockResolvedValue({
        docs: [{ id: "5511990018181_landing-home_1936_303" }],
      });

      const contatos: Contato[] = [
        {
          nome: "Denise",
          telefone: "5511990018181",
          imoveis: [
            {
              edificio: "Landing Home",
              endereco: "VIEIRA DE MORAIS",
              numero: "1936",
              apartamento: "303",
              operacao: "venda",
              valorVenda: "R$970.000,00",
              valorLocacao: "",
            },
          ],
        },
      ];

      const resultado = await deduplicacaoService.verificar("tenant-1", contatos);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].status).toBe("ja_enviado");
    });

    it("deve manter apenas imóveis novos quando contato tem mix de novo e já enviado", async () => {
      // Primeiro imóvel já existe, segundo é novo
      mockGet.mockResolvedValue({
        docs: [{ id: "5511990018181_landing-home_1936_303" }],
      });

      const contatos: Contato[] = [
        {
          nome: "Denise",
          telefone: "5511990018181",
          imoveis: [
            {
              edificio: "Landing Home",
              endereco: "VIEIRA DE MORAIS",
              numero: "1936",
              apartamento: "303",
              operacao: "venda",
              valorVenda: "R$970.000,00",
              valorLocacao: "",
            },
            {
              edificio: "Torre Norte",
              endereco: "RUA OSCAR FREIRE",
              numero: "800",
              apartamento: "1002",
              operacao: "venda",
              valorVenda: "R$1.200.000,00",
              valorLocacao: "",
            },
          ],
        },
      ];

      const resultado = await deduplicacaoService.verificar("tenant-1", contatos);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].status).toBe("novo");
      expect(resultado[0].imoveis).toHaveLength(1);
      expect(resultado[0].imoveis[0].edificio).toBe("Torre Norte");
    });

    it("deve retornar vazio quando não há contatos", async () => {
      const resultado = await deduplicacaoService.verificar("tenant-1", []);
      expect(resultado).toHaveLength(0);
    });
  });

  describe("registrarEnviados", () => {
    it("deve registrar imóveis no batch", async () => {
      await deduplicacaoService.registrarEnviados(
        "tenant-1",
        "5511990018181",
        [
          {
            edificio: "Landing Home",
            endereco: "VIEIRA DE MORAIS",
            numero: "1936",
            apartamento: "303",
            operacao: "venda",
            valorVenda: "R$970.000,00",
            valorLocacao: "",
          },
        ],
        "lote-1",
        "envio-1"
      );

      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(mockCommit).toHaveBeenCalledTimes(1);
    });
  });
});
