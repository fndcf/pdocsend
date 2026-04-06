jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock("../../utils/crypto", () => ({
  decrypt: (val: string) => val,
}));

const mockBuscarEnvio = jest.fn();
const mockAtualizarStatus = jest.fn().mockResolvedValue(undefined);
const mockMarcarEnviado = jest.fn().mockResolvedValue(undefined);
const mockMarcarErro = jest.fn().mockResolvedValue(undefined);
const mockContarPorStatus = jest.fn();

jest.mock("../../repositories/EnvioRepository", () => ({
  __esModule: true,
  default: {
    buscarPorId: mockBuscarEnvio,
    atualizarStatus: mockAtualizarStatus,
    marcarEnviado: mockMarcarEnviado,
    marcarErro: mockMarcarErro,
    contarPorStatus: mockContarPorStatus,
  },
}));

const mockBuscarLote = jest.fn();
const mockAtualizarContadores = jest.fn().mockResolvedValue(undefined);
const mockFinalizarLote = jest.fn().mockResolvedValue(undefined);

jest.mock("../../repositories/LoteRepository", () => ({
  __esModule: true,
  default: {
    buscarPorId: mockBuscarLote,
    atualizarContadores: mockAtualizarContadores,
    finalizar: mockFinalizarLote,
  },
}));

const mockBuscarTenant = jest.fn();

jest.mock("../../repositories/TenantRepository", () => ({
  __esModule: true,
  default: {
    buscarPorId: mockBuscarTenant,
  },
}));

const mockEnviarMensagem = jest.fn().mockResolvedValue({ zapiMessageId: "msg-1" });

jest.mock("../../services/ZApiService", () => ({
  __esModule: true,
  default: {
    enviarMensagem: mockEnviarMensagem,
  },
}));

const mockMontarMensagem = jest.fn(() => "Mensagem gerada");
const mockAplicarSaudacao = jest.fn((msg: string) => msg.replace("{saudacao}", "Bom dia"));

jest.mock("../../services/MessageBuilderService", () => ({
  __esModule: true,
  default: {
    montarMensagem: mockMontarMensagem,
    aplicarSaudacao: mockAplicarSaudacao,
  },
}));

const mockRegistrarEnviados = jest.fn().mockResolvedValue(undefined);

jest.mock("../../services/DeduplicacaoService", () => ({
  __esModule: true,
  default: {
    registrarEnviados: mockRegistrarEnviados,
  },
}));

import envioProcessorService from "../../services/EnvioProcessorService";

const TENANT_ID = "tenant-1";
const LOTE_ID = "lote-1";
const ENVIO_ID = "envio-1";

const envioBase = {
  id: ENVIO_ID,
  telefone: "5511990018181",
  nome: "Denise",
  nomeContato: "Denise - Landing Home",
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
  mensagem: "",
  status: "pendente" as const,
  erro: "",
  enviadoEm: null,
  criadoEm: { seconds: 1700000000 },
};

const tenantBase = {
  id: TENANT_ID,
  nome: "Grupo Imobi",
  zapiInstanceId: "inst-1",
  zapiToken: "token-1",
  zapiClientToken: "client-token-1",
  mensagemTemplate: {
    nomeCorretor: "Felipe",
    nomeEmpresa: "Imobi",
    cargo: "corretor",
  },
  limiteDiario: 200,
  criadoEm: { seconds: 1700000000 },
};

const loteBase = {
  id: LOTE_ID,
  totalEnvios: 1,
  enviados: 0,
  erros: 0,
  status: "em_andamento" as const,
  pdfOrigem: "test.pdf",
  criadoPor: "user-1",
  tenantId: TENANT_ID,
  criadoEm: { seconds: 1700000000 },
  finalizadoEm: null,
};

describe("EnvioProcessorService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar not_found quando envio nao existe", async () => {
    mockBuscarEnvio.mockResolvedValue(null);

    const result = await envioProcessorService.processar(TENANT_ID, LOTE_ID, ENVIO_ID);

    expect(result.status).toBe("not_found");
    expect(mockEnviarMensagem).not.toHaveBeenCalled();
  });

  it("deve retornar already_processed quando envio ja foi enviado", async () => {
    mockBuscarEnvio.mockResolvedValue({ ...envioBase, status: "enviado" });

    const result = await envioProcessorService.processar(TENANT_ID, LOTE_ID, ENVIO_ID);

    expect(result.status).toBe("already_processed");
    expect(mockEnviarMensagem).not.toHaveBeenCalled();
  });

  it("deve retornar already_processed quando envio tem erro", async () => {
    mockBuscarEnvio.mockResolvedValue({ ...envioBase, status: "erro" });

    const result = await envioProcessorService.processar(TENANT_ID, LOTE_ID, ENVIO_ID);

    expect(result.status).toBe("already_processed");
  });

  it("deve retornar already_processed quando envio foi cancelado", async () => {
    mockBuscarEnvio.mockResolvedValue({ ...envioBase, status: "cancelado" });

    const result = await envioProcessorService.processar(TENANT_ID, LOTE_ID, ENVIO_ID);

    expect(result.status).toBe("already_processed");
  });

  it("deve cancelar envio quando lote esta cancelado", async () => {
    mockBuscarEnvio.mockResolvedValue(envioBase);
    mockBuscarLote.mockResolvedValue({ ...loteBase, status: "cancelado" });
    mockContarPorStatus.mockResolvedValue({ enviados: 0, erros: 0, cancelados: 1, total: 1 });

    const result = await envioProcessorService.processar(TENANT_ID, LOTE_ID, ENVIO_ID);

    expect(result.status).toBe("cancelled");
    expect(mockAtualizarStatus).toHaveBeenCalledWith(TENANT_ID, LOTE_ID, ENVIO_ID, "cancelado");
    expect(mockEnviarMensagem).not.toHaveBeenCalled();
  });

  it("deve enviar mensagem com sucesso e finalizar lote", async () => {
    mockBuscarEnvio.mockResolvedValue(envioBase);
    mockBuscarLote.mockResolvedValue(loteBase);
    mockBuscarTenant.mockResolvedValue(tenantBase);
    mockContarPorStatus.mockResolvedValue({ enviados: 1, erros: 0, cancelados: 0, total: 1 });

    const result = await envioProcessorService.processar(TENANT_ID, LOTE_ID, ENVIO_ID);

    expect(result.status).toBe("sent");
    // Marcou como enviando
    expect(mockAtualizarStatus).toHaveBeenCalledWith(TENANT_ID, LOTE_ID, ENVIO_ID, "enviando");
    // Enviou via Z-API
    expect(mockEnviarMensagem).toHaveBeenCalledWith(
      "inst-1", "token-1", "client-token-1", "5511990018181", "Mensagem gerada"
    );
    // Marcou como enviado
    expect(mockMarcarEnviado).toHaveBeenCalledWith(TENANT_ID, LOTE_ID, ENVIO_ID, "Mensagem gerada");
    // Registrou deduplicacao
    expect(mockRegistrarEnviados).toHaveBeenCalledWith(
      TENANT_ID, "5511990018181", envioBase.imoveis, LOTE_ID, ENVIO_ID
    );
    // Finalizou o lote (1 processado de 1 total)
    expect(mockFinalizarLote).toHaveBeenCalledWith(
      TENANT_ID, LOTE_ID, expect.objectContaining({ enviados: 1, erros: 0, cancelados: 0 })
    );
  });

  it("deve usar aplicarSaudacao quando mensagem foi editada pelo corretor", async () => {
    const envioComMensagem = { ...envioBase, mensagem: "{saudacao} Denise, tudo bem?" };
    mockBuscarEnvio.mockResolvedValue(envioComMensagem);
    mockBuscarLote.mockResolvedValue(loteBase);
    mockBuscarTenant.mockResolvedValue(tenantBase);
    mockContarPorStatus.mockResolvedValue({ enviados: 1, erros: 0, cancelados: 0, total: 1 });

    const result = await envioProcessorService.processar(TENANT_ID, LOTE_ID, ENVIO_ID);

    expect(result.status).toBe("sent");
    expect(mockAplicarSaudacao).toHaveBeenCalledWith("{saudacao} Denise, tudo bem?");
    expect(mockMontarMensagem).not.toHaveBeenCalled();
  });

  it("deve retornar erro quando Z-API nao esta configurada", async () => {
    // Usa tenantId diferente para não pegar cache de testes anteriores
    const tenantSemZapi = "tenant-sem-zapi";
    mockBuscarEnvio.mockResolvedValue(envioBase);
    mockBuscarLote.mockResolvedValue(loteBase);
    mockBuscarTenant.mockResolvedValue({ ...tenantBase, id: tenantSemZapi, zapiInstanceId: "" });
    mockContarPorStatus.mockResolvedValue({ enviados: 0, erros: 1, cancelados: 0, total: 1 });

    const result = await envioProcessorService.processar(tenantSemZapi, LOTE_ID, ENVIO_ID);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toBe("Z-API não configurada para este tenant");
    expect(mockMarcarErro).toHaveBeenCalledWith(tenantSemZapi, LOTE_ID, ENVIO_ID, "Z-API não configurada para este tenant");
  });

  it("deve marcar erro quando Z-API falha", async () => {
    mockBuscarEnvio.mockResolvedValue(envioBase);
    mockBuscarLote.mockResolvedValue(loteBase);
    mockBuscarTenant.mockResolvedValue(tenantBase);
    mockEnviarMensagem.mockRejectedValueOnce(new Error("Z-API timeout"));
    mockContarPorStatus.mockResolvedValue({ enviados: 0, erros: 1, cancelados: 0, total: 1 });

    const result = await envioProcessorService.processar(TENANT_ID, LOTE_ID, ENVIO_ID);

    expect(result.status).toBe("error");
    expect((result as { error: string }).error).toBe("Z-API timeout");
    expect(mockMarcarErro).toHaveBeenCalledWith(TENANT_ID, LOTE_ID, ENVIO_ID, "Z-API timeout");
  });

  it("nao deve finalizar lote quando ainda tem envios pendentes", async () => {
    const lote2Envios = { ...loteBase, totalEnvios: 2 };
    mockBuscarEnvio.mockResolvedValue(envioBase);
    mockBuscarLote.mockResolvedValue(lote2Envios);
    mockBuscarTenant.mockResolvedValue(tenantBase);
    mockContarPorStatus.mockResolvedValue({ enviados: 1, erros: 0, cancelados: 0, total: 2 });

    const result = await envioProcessorService.processar(TENANT_ID, LOTE_ID, ENVIO_ID);

    expect(result.status).toBe("sent");
    expect(mockFinalizarLote).not.toHaveBeenCalled();
  });
});
