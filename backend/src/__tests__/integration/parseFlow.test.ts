/**
 * Testes de integração: fluxo completo de parsing
 * Parse PDF → Clean → Dedup → MessageBuilder
 */

jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import pdfParserService from "../../services/PdfParserService";
import dataCleanerService from "../../services/DataCleanerService";
import messageBuilderService from "../../services/MessageBuilderService";
import { MensagemTemplate } from "../../models/Tenant";

const template: MensagemTemplate = {
  nomeCorretor: "Felipe Dias",
  nomeEmpresa: "grupo Imobi",
  cargo: "corretor",
};

describe("Fluxo de integração: Parse → Clean → Message", () => {
  it("deve processar texto simulado de PDF e gerar mensagens corretas", () => {
    // Simular texto extraído de um PDF
    const textoSimulado =
      "Informações do imóvel - Ap Data 02/04/2026 " +
      "Edfício Residencial Aurora Referência 900001 " +
      "Endereço AVENIDA PAULISTA Número 1500 Apt 501 Bloco - CEP 01310-100 " +
      "Bairro CAMPO BELO " +
      "Salas - Dormi S Suítes - Vagas S " +
      "Indicador Milson Promotor Milson Venda m - 2 Aluguel m - 2 " +
      "Informações do proprietário " +
      "Proprietário Fernando Teste 13 98120 8811 " +
      "Telefone 13 98120 8811 E-mail - " +
      "Condomínio R$1.200,00 Locação R$R$0,00 Venda R$850.000,00 " +
      "Informações do imóvel - Ap Data 02/04/2026 " +
      "Edfício - Referência 900002 " +
      "Endereço RUA AUGUSTA Número 2000 Apt 302 Bloco - CEP 01412-000 " +
      "Bairro CAMPO BELO " +
      "Salas - Dormi S Suítes - Vagas S " +
      "Indicador Milson Promotor Milson Venda m - 2 Aluguel m - 2 " +
      "Informações do proprietário " +
      "Proprietário Maria Teste 13 99149 9997 " +
      "Telefone 13 99149 9997 E-mail - " +
      "Condomínio R$800,00 Locação R$R$4.500,00 Venda R$0,00 " +
      "Informações do imóvel - Ap Data 02/04/2026 " +
      "Edfício Torre Norte Referência 900003 " +
      "Endereço RUA OSCAR FREIRE Número 800 Apt 1002 Bloco - CEP 01426-001 " +
      "Bairro CAMPO BELO " +
      "Salas - Dormi S Suítes - Vagas S " +
      "Indicador Milson Promotor Milson Venda m - 2 Aluguel m - 2 " +
      "Informações do proprietário " +
      "Proprietário Fernando Teste 13 98120 8811 " +
      "Telefone 13 98120 8811 E-mail - " +
      "Condomínio R$1.500,00 Locação R$R$5.000,00 Venda R$1.200.000,00 ";

    // Step 1: Parse
    const brutos = pdfParserService.parseTexto(textoSimulado);
    expect(brutos).toHaveLength(3);
    expect(brutos[0].proprietario).toBe("Fernando Teste 13 98120 8811");
    expect(brutos[1].proprietario).toBe("Maria Teste 13 99149 9997");

    // Step 2: Clean + Dedup + Agrupar
    const { contatos } = dataCleanerService.processar(brutos);
    expect(contatos).toHaveLength(2); // Fernando (2 imóveis agrupados) + Maria

    // Verificar Fernando (agrupado)
    const fernando = contatos.find((c) => c.nome === "Fernando Teste");
    expect(fernando).toBeDefined();
    expect(fernando!.telefone).toBe("5513981208811");
    expect(fernando!.imoveis).toHaveLength(2);
    expect(fernando!.imoveis[0].edificio).toBe("Residencial Aurora");
    expect(fernando!.imoveis[0].operacao).toBe("venda");
    expect(fernando!.imoveis[1].edificio).toBe("Torre Norte");
    expect(fernando!.imoveis[1].operacao).toBe("venda e locacao");

    // Verificar Maria
    const maria = contatos.find((c) => c.nome === "Maria Teste");
    expect(maria).toBeDefined();
    expect(maria!.telefone).toBe("5513991499997");
    expect(maria!.imoveis).toHaveLength(1);
    expect(maria!.imoveis[0].operacao).toBe("locacao");

    // Step 3: Gerar mensagens
    const msgFernando = messageBuilderService.montarMensagemPreview(fernando!, template);
    expect(msgFernando).toContain("Fernando Teste");
    expect(msgFernando).toContain("Felipe Dias");
    expect(msgFernando).toContain("grupo Imobi");
    expect(msgFernando).toContain("Residencial Aurora");
    expect(msgFernando).toContain("Torre Norte");

    const msgMaria = messageBuilderService.montarMensagemPreview(maria!, template);
    expect(msgMaria).toContain("Maria Teste");
    expect(msgMaria).toContain("locação");
    expect(msgMaria).toContain("RUA AUGUSTA");

    // Step 4: Nome do contato
    const nomeFernando = messageBuilderService.montarNomeContato(fernando!);
    expect(nomeFernando).toBe("Fernando Teste - Residencial Aurora (Apt 501)");

    const nomeMaria = messageBuilderService.montarNomeContato(maria!);
    expect(nomeMaria).toBe("Maria Teste - RUA AUGUSTA, 2000 (Apt 302)");
  });

  it("deve mesclar entradas duplicadas com locação e venda separadas", () => {
    const texto =
      "Informações do imóvel - Ap Data 02/04/2026 " +
      "Edfício Landing Home Referência 900001 " +
      "Endereço VIEIRA DE MORAIS Número 1936 Apt 1203 Bloco - CEP 04617-011 " +
      "Bairro CAMPO BELO " +
      "Indicador Milson Promotor Milson Venda m - 2 Aluguel m - 2 " +
      "Informações do proprietário " +
      "Proprietário Viviane 11 94743 6987 " +
      "Telefone 11 94743 6987 E-mail - " +
      "Condomínio R$730,00 Locação R$R$3.500,00 Venda R$0,00 " +
      "Informações do imóvel - Ap Data 02/04/2026 " +
      "Edfício Landing Home Referência 900001 " +
      "Endereço VIEIRA DE MORAIS Número 1936 Apt 1203 Bloco - CEP 04617-011 " +
      "Bairro CAMPO BELO " +
      "Indicador Milson Promotor Milson Venda m - 2 Aluguel m - 2 " +
      "Informações do proprietário " +
      "Proprietário Viviane 11 94743 6987 " +
      "Telefone 11 94743 6987 E-mail - " +
      "Condomínio R$730,00 Locação R$R$0,00 Venda R$610.000,00 ";

    const brutos = pdfParserService.parseTexto(texto);
    expect(brutos).toHaveLength(2);

    const { contatos } = dataCleanerService.processar(brutos);
    expect(contatos).toHaveLength(1);
    expect(contatos[0].imoveis).toHaveLength(1);
    expect(contatos[0].imoveis[0].operacao).toBe("venda e locacao");
    expect(contatos[0].imoveis[0].valorLocacao).toBe("R$3.500,00");
    expect(contatos[0].imoveis[0].valorVenda).toBe("R$610.000,00");
  });

  it("deve capitalizar nomes corretamente", () => {
    const texto =
      "Informações do imóvel - Ap Data 02/04/2026 " +
      "Edfício Ed Teste Referência 900001 " +
      "Endereço RUA TESTE Número 100 Apt 1 Bloco - CEP 01000-000 " +
      "Bairro CAMPO BELO " +
      "Indicador Milson Promotor Milson Venda m - 2 Aluguel m - 2 " +
      "Informações do proprietário " +
      "Proprietário PAULO 99442 6567 " +
      "Telefone 11 99442 6567 E-mail - " +
      "Condomínio R$500,00 Locação R$R$0,00 Venda R$300.000,00 ";

    const brutos = pdfParserService.parseTexto(texto);
    const { contatos } = dataCleanerService.processar(brutos);

    expect(contatos[0].nome).toBe("Paulo");
  });
});
