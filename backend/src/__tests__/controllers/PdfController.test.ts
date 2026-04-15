jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockExtrairDoPdf = jest.fn();
jest.mock("../../services/PdfParserService", () => ({
  __esModule: true,
  default: { extrairDoPdf: mockExtrairDoPdf },
}));

const mockProcessar = jest.fn();
jest.mock("../../services/DataCleanerService", () => ({
  __esModule: true,
  default: { processar: mockProcessar },
}));

const mockVerificar = jest.fn();
jest.mock("../../services/DeduplicacaoService", () => ({
  __esModule: true,
  default: { verificar: mockVerificar },
}));

jest.mock("../../services/MessageBuilderService", () => ({
  __esModule: true,
  default: {
    montarNomeContato: jest.fn(() => "Contato - Edificio"),
    montarMensagemPreview: jest.fn(() => "Bom dia, tudo bem?"),
  },
}));

const mockBuscarPorId = jest.fn();
jest.mock("../../repositories/TenantRepository", () => ({
  __esModule: true,
  default: { buscarPorId: mockBuscarPorId },
}));

jest.mock("../../config/firebase", () => ({
  db: {},
  auth: {},
}));

import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth";
import pdfController from "../../controllers/PdfController";

describe("PdfController", () => {
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

  it("deve retornar 400 quando nenhum arquivo e enviado", async () => {
    const req = {
      user: baseUser,
      file: undefined,
    } as unknown as AuthRequest;
    const res = mockRes();

    await pdfController.processar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0].error).toContain("Nenhum arquivo");
  });

  it("deve retornar 400 quando PDF nao contem imoveis", async () => {
    mockExtrairDoPdf.mockResolvedValue([]);

    const req = {
      user: baseUser,
      file: { buffer: Buffer.from("pdf"), originalname: "test.pdf", size: 1000 },
      formFields: {},
    } as unknown as AuthRequest;
    const res = mockRes();

    await pdfController.processar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0].error).toContain("Nenhum imóvel encontrado");
  });

  it("deve processar PDF com sucesso e retornar contatos", async () => {
    const brutos = [
      { proprietario: "Maria", telefone: "11999001122", edificio: "Solar Park" },
    ];
    const contatos = [
      {
        nome: "Maria",
        telefone: "5511999001122",
        imoveis: [
          { edificio: "Solar Park", endereco: "", numero: "", apartamento: "", operacao: "venda", valorVenda: "500000", valorLocacao: "" },
        ],
      },
    ];
    const contatosComStatus = [
      {
        ...contatos[0],
        status: "novo",
        hashesNovos: ["h1"],
        hashesExistentes: [],
      },
    ];

    mockExtrairDoPdf.mockResolvedValue(brutos);
    mockProcessar.mockReturnValue({ contatos, telefoneInvalido: 0 });
    mockVerificar.mockResolvedValue(contatosComStatus);
    mockBuscarPorId.mockResolvedValue({
      id: "tenant-1",
      mensagemTemplate: { nomeCorretor: "Felipe", nomeEmpresa: "Imobi", cargo: "corretor" },
    });

    const req = {
      user: baseUser,
      file: { buffer: Buffer.from("pdf"), originalname: "campo_belo.pdf", size: 5000 },
      formFields: { filtroOperacao: "todos" },
    } as unknown as AuthRequest;
    const res = mockRes();

    await pdfController.processar(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = (res.json as jest.Mock).mock.calls[0][0];
    expect(response.data.contatos).toHaveLength(1);
    expect(response.data.pdfOrigem).toBe("campo_belo.pdf");
    expect(response.data.resumo.novos).toBe(1);
  });

  it("deve aplicar filtro de venda", async () => {
    const brutos = [{ proprietario: "Ana", telefone: "11999003344" }];
    const contatos = [
      {
        nome: "Ana",
        telefone: "5511999003344",
        imoveis: [
          { edificio: "Ed A", endereco: "", numero: "", apartamento: "", operacao: "locacao", valorVenda: "", valorLocacao: "3000" },
        ],
      },
    ];

    mockExtrairDoPdf.mockResolvedValue(brutos);
    mockProcessar.mockReturnValue({ contatos, telefoneInvalido: 0 });

    const req = {
      user: baseUser,
      file: { buffer: Buffer.from("pdf"), originalname: "test.pdf", size: 1000 },
      formFields: { filtroOperacao: "venda" },
    } as unknown as AuthRequest;
    const res = mockRes();

    await pdfController.processar(req, res);

    // Nenhum contato com operacao de venda, deve retornar 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0].error).toContain("Nenhum contato encontrado com operação de venda");
  });

  it("deve aplicar filtro de locacao", async () => {
    const brutos = [{ proprietario: "Ana", telefone: "11999003344" }];
    const contatos = [
      {
        nome: "Ana",
        telefone: "5511999003344",
        imoveis: [
          { edificio: "Ed A", endereco: "", numero: "", apartamento: "", operacao: "venda", valorVenda: "500000", valorLocacao: "" },
        ],
      },
    ];

    mockExtrairDoPdf.mockResolvedValue(brutos);
    mockProcessar.mockReturnValue({ contatos, telefoneInvalido: 0 });

    const req = {
      user: baseUser,
      file: { buffer: Buffer.from("pdf"), originalname: "test.pdf", size: 1000 },
      formFields: { filtroOperacao: "locacao" },
    } as unknown as AuthRequest;
    const res = mockRes();

    await pdfController.processar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0].error).toContain("locação");
  });

  it("deve ajustar operacao 'venda e locacao' quando filtro e venda", async () => {
    const brutos = [{ proprietario: "Ana", telefone: "11999003344" }];
    const contatos = [
      {
        nome: "Ana",
        telefone: "5511999003344",
        imoveis: [
          { edificio: "Ed A", endereco: "", numero: "", apartamento: "", operacao: "venda e locacao", valorVenda: "500000", valorLocacao: "3000" },
        ],
      },
    ];
    const contatosComStatus = [
      {
        ...contatos[0],
        imoveis: [{ ...contatos[0].imoveis[0], operacao: "venda", valorLocacao: "" }],
        status: "novo",
        hashesNovos: ["h1"],
        hashesExistentes: [],
      },
    ];

    mockExtrairDoPdf.mockResolvedValue(brutos);
    mockProcessar.mockReturnValue({ contatos, telefoneInvalido: 0 });
    mockVerificar.mockResolvedValue(contatosComStatus);
    mockBuscarPorId.mockResolvedValue({
      id: "tenant-1",
      mensagemTemplate: { nomeCorretor: "Felipe", nomeEmpresa: "Imobi", cargo: "corretor" },
    });

    const req = {
      user: baseUser,
      file: { buffer: Buffer.from("pdf"), originalname: "test.pdf", size: 1000 },
      formFields: { filtroOperacao: "venda" },
    } as unknown as AuthRequest;
    const res = mockRes();

    await pdfController.processar(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockVerificar).toHaveBeenCalled();
  });

  it("deve usar template padrao quando tenant nao tem template", async () => {
    const brutos = [{ proprietario: "X", telefone: "11999" }];
    const contatos = [
      {
        nome: "X",
        telefone: "5511999",
        imoveis: [{ edificio: "Ed", endereco: "", numero: "", apartamento: "", operacao: "venda", valorVenda: "1", valorLocacao: "" }],
      },
    ];

    mockExtrairDoPdf.mockResolvedValue(brutos);
    mockProcessar.mockReturnValue({ contatos, telefoneInvalido: 0 });
    mockVerificar.mockResolvedValue([
      { ...contatos[0], status: "novo", hashesNovos: ["h"], hashesExistentes: [] },
    ]);
    mockBuscarPorId.mockResolvedValue(null);

    const req = {
      user: baseUser,
      file: { buffer: Buffer.from("pdf"), originalname: "t.pdf", size: 100 },
      formFields: {},
    } as unknown as AuthRequest;
    const res = mockRes();

    await pdfController.processar(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("deve retornar 400 quando PdfParser lanca erro", async () => {
    mockExtrairDoPdf.mockRejectedValue(new Error("Erro ao processar o PDF: formato invalido"));

    const req = {
      user: baseUser,
      file: { buffer: Buffer.from("pdf"), originalname: "bad.pdf", size: 100 },
      formFields: {},
    } as unknown as AuthRequest;
    const res = mockRes();

    await pdfController.processar(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("deve retornar 500 para erros genericos", async () => {
    mockExtrairDoPdf.mockRejectedValue(new Error("Algo inesperado"));

    const req = {
      user: baseUser,
      file: { buffer: Buffer.from("pdf"), originalname: "test.pdf", size: 100 },
      formFields: {},
    } as unknown as AuthRequest;
    const res = mockRes();

    await pdfController.processar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
