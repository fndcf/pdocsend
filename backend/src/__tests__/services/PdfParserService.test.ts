jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import pdfParserService from "../../services/PdfParserService";

describe("PdfParserService", () => {
  describe("parseTexto", () => {
    it("deve extrair imóvel com todos os campos", () => {
      const texto = buildBloco({
        edificio: "Landing Home",
        endereco: "VIEIRA DE MORAIS",
        numero: "1936",
        apt: "303",
        proprietario: "Denise 11 99001 8181",
        telefone: "11 99001 8181",
        locacao: "R$R$0,00",
        venda: "R$970.000,00",
      });

      const resultado = pdfParserService.parseTexto(texto);

      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toEqual(
        expect.objectContaining({
          edificio: "Landing Home",
          endereco: "VIEIRA DE MORAIS",
          numero: "1936",
          apartamento: "303",
          proprietario: "Denise 11 99001 8181",
          telefone: "11990018181",
          locacao: "R$R$0,00",
          venda: "R$970.000,00",
        })
      );
    });

    it("deve extrair imóvel sem edifício", () => {
      const texto = buildBloco({
        edificio: "-",
        endereco: "Renascenca",
        numero: "112",
        apt: "2",
        proprietario: "Rodrigo 1193145 9333",
        telefone: "1193145 9333",
        locacao: "R$R$25.000,00",
        venda: "R$0,00",
      });

      const resultado = pdfParserService.parseTexto(texto);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].edificio).toBe("-");
      expect(resultado[0].endereco).toBe("Renascenca");
    });

    it("deve extrair múltiplos imóveis", () => {
      const texto =
        buildBloco({
          edificio: "Ed A",
          endereco: "Rua A",
          numero: "100",
          apt: "1",
          proprietario: "Joao 11999990000",
          telefone: "11999990000",
          locacao: "R$R$0,00",
          venda: "R$500.000,00",
        }) +
        buildBloco({
          edificio: "Ed B",
          endereco: "Rua B",
          numero: "200",
          apt: "2",
          proprietario: "Maria 11888880000",
          telefone: "11888880000",
          locacao: "R$R$3.000,00",
          venda: "R$0,00",
        });

      const resultado = pdfParserService.parseTexto(texto);
      expect(resultado).toHaveLength(2);
    });

    it("deve ignorar blocos sem proprietário", () => {
      const texto =
        "Informações do imóvel Data 30/01/2026 Edfício Landing Home " +
        "Referência 821444 Endereço VIEIRA DE MORAIS Número 1936 Apt 303 Bloco - ";

      const resultado = pdfParserService.parseTexto(texto);
      expect(resultado).toHaveLength(0);
    });

    it("deve extrair telefone sem espaços", () => {
      const texto = buildBloco({
        edificio: "-",
        endereco: "Rua Teste",
        numero: "100",
        apt: "-",
        proprietario: "Carlos 12 98258 4454",
        telefone: "12 98258 4454",
        locacao: "R$R$0,00",
        venda: "R$800.000,00",
      });

      const resultado = pdfParserService.parseTexto(texto);
      expect(resultado[0].telefone).toBe("12982584454");
    });

    it("deve retornar array vazio para texto sem blocos", () => {
      const resultado = pdfParserService.parseTexto("texto qualquer sem blocos");
      expect(resultado).toHaveLength(0);
    });

    it("deve extrair endereço completo sem fragmentação", () => {
      const texto = buildBloco({
        edificio: "-",
        endereco: "CRISTOVAO PEREIRA",
        numero: "170",
        apt: "06",
        proprietario: "Dieide 11 95826 9860",
        telefone: "11 95826 9860",
        locacao: "R$R$0,00",
        venda: "R$3.900.000,00",
      });

      const resultado = pdfParserService.parseTexto(texto);
      expect(resultado[0].endereco).toBe("CRISTOVAO PEREIRA");
    });
  });
});

/**
 * Helper para construir um bloco de imóvel no formato do pdf.js-extract
 */
function buildBloco(dados: {
  edificio: string;
  endereco: string;
  numero: string;
  apt: string;
  proprietario: string;
  telefone: string;
  locacao: string;
  venda: string;
}): string {
  return (
    `Informações do imóvel Data 30/01/2026 ` +
    `Edfício ${dados.edificio} Referência 821444 ` +
    `Endereço ${dados.endereco} Número ${dados.numero} ` +
    `Apt ${dados.apt} Bloco - CEP 04617-011 ` +
    `Bairro CAMPO BELO ` +
    `Indicador Milson Venda m - 2 Aluguel m - 2 ` +
    `Informações do proprietário ` +
    `Proprietário ${dados.proprietario} ` +
    `Telefone ${dados.telefone} ` +
    `E-mail - Condomínio R$950,00 ` +
    `Locação ${dados.locacao} Venda ${dados.venda} `
  );
}
