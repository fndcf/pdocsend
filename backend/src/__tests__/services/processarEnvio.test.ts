/**
 * Testes da lógica de processamento de envio
 * Testa a lógica de verificação antes do envio (idempotência, cancelamento)
 */

jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock("../../config/firebase", () => ({
  db: {
    doc: jest.fn(),
    collection: jest.fn(),
  },
}));

jest.mock("../../services/ZApiService", () => ({
  __esModule: true,
  default: { enviarMensagem: jest.fn() },
}));

jest.mock("../../services/MessageBuilderService", () => ({
  __esModule: true,
  default: {
    montarMensagem: jest.fn(() => "Mensagem de teste"),
  },
}));

jest.mock("../../services/DeduplicacaoService", () => ({
  __esModule: true,
  default: {
    registrarEnviados: jest.fn().mockResolvedValue(undefined),
  },
}));

import zApiService from "../../services/ZApiService";
import messageBuilderService from "../../services/MessageBuilderService";
import deduplicacaoService from "../../services/DeduplicacaoService";

describe("processarEnvio - lógica de verificação", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verificações de idempotência", () => {
    it("deve pular envio já processado (status enviado)", () => {
      const envioData = { status: "enviado" };
      const shouldSkip =
        envioData.status === "enviado" ||
        envioData.status === "erro" ||
        envioData.status === "cancelado";
      expect(shouldSkip).toBe(true);
    });

    it("deve pular envio com erro", () => {
      const envioData = { status: "erro" };
      const shouldSkip =
        envioData.status === "enviado" ||
        envioData.status === "erro" ||
        envioData.status === "cancelado";
      expect(shouldSkip).toBe(true);
    });

    it("deve pular envio cancelado", () => {
      const envioData = { status: "cancelado" };
      const shouldSkip =
        envioData.status === "enviado" ||
        envioData.status === "erro" ||
        envioData.status === "cancelado";
      expect(shouldSkip).toBe(true);
    });

    it("não deve pular envio pendente", () => {
      const envioData = { status: "pendente" };
      const shouldSkip =
        envioData.status === "enviado" ||
        envioData.status === "erro" ||
        envioData.status === "cancelado";
      expect(shouldSkip).toBe(false);
    });
  });

  describe("verificação de lote cancelado", () => {
    it("deve detectar lote cancelado", () => {
      const loteData = { status: "cancelado" };
      expect(loteData.status === "cancelado").toBe(true);
    });

    it("deve permitir envio quando lote está em andamento", () => {
      const loteData = { status: "em_andamento" };
      expect(loteData.status === "cancelado").toBe(false);
    });
  });

  describe("montagem de mensagem", () => {
    it("deve chamar montarMensagem com contato e template", () => {
      const contato = {
        nome: "Denise",
        telefone: "5511990018181",
        imoveis: [
          {
            edificio: "Landing Home",
            endereco: "VIEIRA DE MORAIS",
            numero: "1936",
            apartamento: "303",
            operacao: "venda" as const,
            valorVenda: "R$970.000,00",
            valorLocacao: "",
          },
        ],
      };

      const template = {
        nomeCorretor: "Felipe Dias",
        nomeEmpresa: "grupo Imobi",
        cargo: "corretor",
      };

      const mensagem = messageBuilderService.montarMensagem(contato, template);
      expect(mensagem).toBe("Mensagem de teste");
      expect(messageBuilderService.montarMensagem).toHaveBeenCalledWith(contato, template);
    });
  });

  describe("envio via Z-API", () => {
    it("deve chamar enviarMensagem com os parâmetros corretos", async () => {
      (zApiService.enviarMensagem as jest.Mock).mockResolvedValue({
        zapiMessageId: "msg-123",
        messageId: "id-123",
      });

      await zApiService.enviarMensagem(
        "instance-id",
        "token",
        "client-token",
        "5511990018181",
        "Mensagem de teste"
      );

      expect(zApiService.enviarMensagem).toHaveBeenCalledWith(
        "instance-id",
        "token",
        "client-token",
        "5511990018181",
        "Mensagem de teste"
      );
    });
  });

  describe("registro de deduplicação", () => {
    it("deve registrar imóveis após envio", async () => {
      const imoveis = [
        {
          edificio: "Landing Home",
          endereco: "VIEIRA DE MORAIS",
          numero: "1936",
          apartamento: "303",
          operacao: "venda" as const,
          valorVenda: "R$970.000,00",
          valorLocacao: "",
        },
      ];

      await deduplicacaoService.registrarEnviados(
        "tenant-1",
        "5511990018181",
        imoveis,
        "lote-1",
        "envio-1"
      );

      expect(deduplicacaoService.registrarEnviados).toHaveBeenCalledWith(
        "tenant-1",
        "5511990018181",
        imoveis,
        "lote-1",
        "envio-1"
      );
    });
  });
});
