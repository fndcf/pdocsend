jest.mock("../../utils/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import dataCleanerService from "../../services/DataCleanerService";
import { ImovelBruto } from "../../services/PdfParserService";

describe("DataCleanerService", () => {
  describe("processar", () => {
    it("deve limpar e retornar contato com imóvel de venda", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "Landing Home",
          endereco: "VIEIRA DE MORAIS",
          numero: "1936",
          apartamento: "303",
          proprietario: "Denise 11 99001 8181",
          telefone: "11990018181",
          locacao: "R$R$0,00",
          venda: "R$970.000,00",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);

      expect(contatos).toHaveLength(1);
      expect(contatos[0].nome).toBe("Denise");
      expect(contatos[0].telefone).toBe("5511990018181");
      expect(contatos[0].imoveis).toHaveLength(1);
      expect(contatos[0].imoveis[0].operacao).toBe("venda");
      expect(contatos[0].imoveis[0].edificio).toBe("Landing Home");
    });

    it("deve limpar e retornar contato com imóvel de locação", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "-",
          endereco: "Renascenca",
          numero: "112",
          apartamento: "2",
          proprietario: "Rodrigo 1193145 9333",
          telefone: "11931459333",
          locacao: "R$R$25.000,00",
          venda: "R$0,00",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);

      expect(contatos).toHaveLength(1);
      expect(contatos[0].imoveis[0].operacao).toBe("locacao");
      expect(contatos[0].imoveis[0].edificio).toBe("");
      expect(contatos[0].imoveis[0].endereco).toBe("Renascenca");
    });

    it("deve detectar operação venda e locação quando ambos têm valor", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "Ed Teste",
          endereco: "Rua Teste",
          numero: "100",
          apartamento: "1",
          proprietario: "Maria 11999990000",
          telefone: "11999990000",
          locacao: "R$R$5.000,00",
          venda: "R$800.000,00",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);

      expect(contatos[0].imoveis[0].operacao).toBe("venda e locacao");
    });

    it("deve ignorar imóvel sem operação (venda e locação ambos R$0,00)", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "Ed Teste",
          endereco: "Rua Teste",
          numero: "100",
          apartamento: "1",
          proprietario: "Joao 11999990000",
          telefone: "11999990000",
          locacao: "R$R$0,00",
          venda: "R$0,00",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);
      expect(contatos).toHaveLength(0);
    });

    it("deve agrupar múltiplos imóveis do mesmo telefone", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "-",
          endereco: "Renascenca",
          numero: "112",
          apartamento: "2",
          proprietario: "Rodrigo 1193145 9333",
          telefone: "11931459333",
          locacao: "R$R$25.000,00",
          venda: "R$0,00",
        },
        {
          edificio: "-",
          endereco: "Renascenca",
          numero: "112",
          apartamento: "3",
          proprietario: "Rodrigo 1193145 9333",
          telefone: "11931459333",
          locacao: "R$R$25.000,00",
          venda: "R$0,00",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);

      expect(contatos).toHaveLength(1);
      expect(contatos[0].imoveis).toHaveLength(2);
      expect(contatos[0].imoveis[0].apartamento).toBe("2");
      expect(contatos[0].imoveis[1].apartamento).toBe("3");
    });

    it("deve deduplicar imóveis com mesma chave (telefone + edificio + numero + apt)", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "Landing Home",
          endereco: "VIEIRA DE MORAIS",
          numero: "1936",
          apartamento: "1203",
          proprietario: "Viviane 11 94743 6987",
          telefone: "11947436987",
          locacao: "R$R$5.000,00",
          venda: "R$0,00",
        },
        {
          edificio: "Landing Home",
          endereco: "VIEIRA DE MORAIS",
          numero: "1936",
          apartamento: "1203",
          proprietario: "Viviane 11 94743 6987",
          telefone: "11947436987",
          locacao: "R$R$5.000,00",
          venda: "R$0,00",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);

      expect(contatos).toHaveLength(1);
      expect(contatos[0].imoveis).toHaveLength(1);
    });

    it("deve manter imóveis diferentes do mesmo telefone (apt diferente)", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "CUBE CAMPO BELO",
          endereco: "GABRIELE D ANNUNZIO",
          numero: "624",
          apartamento: "13",
          proprietario: "Antonio Jose 11 99410 6052",
          telefone: "11994106052",
          locacao: "R$R$0,00",
          venda: "R$1.200.000,00",
        },
        {
          edificio: "CUBE CAMPO BELO",
          endereco: "GABRIELE D ANNUNZIO",
          numero: "614",
          apartamento: "136",
          proprietario: "Antonio Jose Filho 11 99410 6052",
          telefone: "11994106052",
          locacao: "R$R$0,00",
          venda: "R$900.000,00",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);

      expect(contatos).toHaveLength(1);
      expect(contatos[0].imoveis).toHaveLength(2);
    });

    it("deve extrair nome sem números", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "Ed Teste",
          endereco: "Rua Teste",
          numero: "100",
          apartamento: "1",
          proprietario: "Antonio Jose 11 99410 6052",
          telefone: "11994106052",
          locacao: "R$R$0,00",
          venda: "R$500.000,00",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);
      expect(contatos[0].nome).toBe("Antonio Jose");
    });

    it("deve ignorar imóvel sem endereço nem edifício", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "-",
          endereco: "",
          numero: "",
          apartamento: "-",
          proprietario: "Joao 11999990000",
          telefone: "11999990000",
          locacao: "R$R$0,00",
          venda: "R$500.000,00",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);
      expect(contatos).toHaveLength(0);
    });

    it("deve ignorar imóvel com telefone inválido e contar em telefoneInvalido", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "Ed Teste",
          endereco: "Rua Teste",
          numero: "100",
          apartamento: "1",
          proprietario: "Joao 123",
          telefone: "123",
          locacao: "R$R$0,00",
          venda: "R$500.000,00",
        },
        {
          edificio: "Ed Teste",
          endereco: "Rua Teste",
          numero: "100",
          apartamento: "2",
          proprietario: "Maria",
          telefone: "4915152958188",
          locacao: "R$R$0,00",
          venda: "R$300.000,00",
        },
      ];

      const { contatos, telefoneInvalido } = dataCleanerService.processar(brutos);
      expect(contatos).toHaveLength(0);
      expect(telefoneInvalido).toBe(2);
    });

    it("deve tratar PAULO com 8 imóveis agrupados", () => {
      const base = {
        edificio: "-",
        endereco: "VIEIRA DE MORAIS",
        numero: "1869",
        proprietario: "PAULO 99442 6567",
        telefone: "11994426567",
        locacao: "R$R$3.000,00",
        venda: "R$0,00",
      };

      const brutos: ImovelBruto[] = [
        { ...base, apartamento: "4" },
        { ...base, apartamento: "11" },
        { ...base, apartamento: "21" },
        { ...base, apartamento: "31" },
        { ...base, apartamento: "20" },
        { ...base, apartamento: "30" },
        { ...base, apartamento: "10" },
        {
          ...base,
          endereco: "Bernardino de Campos",
          numero: "221",
          apartamento: "-",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);

      expect(contatos).toHaveLength(1);
      expect(contatos[0].nome).toBe("Paulo");
      expect(contatos[0].imoveis).toHaveLength(8);
    });

    it("deve mesclar entradas duplicadas com locação e venda separadas", () => {
      const brutos: ImovelBruto[] = [
        {
          edificio: "Landing Home",
          endereco: "VIEIRA DE MORAIS",
          numero: "1936",
          apartamento: "1203",
          proprietario: "Viviane Epfani 11 94743 6987",
          telefone: "11947436987",
          locacao: "R$R$3.500,00",
          venda: "R$0,00",
        },
        {
          edificio: "Landing Home",
          endereco: "VIEIRA DE MORAIS",
          numero: "1936",
          apartamento: "1203",
          proprietario: "Viviane Epfani 11 94743 6987",
          telefone: "11947436987",
          locacao: "R$R$0,00",
          venda: "R$610.000,00",
        },
      ];

      const { contatos } = dataCleanerService.processar(brutos);

      expect(contatos).toHaveLength(1);
      expect(contatos[0].imoveis).toHaveLength(1);
      expect(contatos[0].imoveis[0].operacao).toBe("venda e locacao");
      expect(contatos[0].imoveis[0].valorLocacao).toBe("R$3.500,00");
      expect(contatos[0].imoveis[0].valorVenda).toBe("R$610.000,00");
    });
  });
});
