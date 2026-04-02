import messageBuilderService from "../../services/MessageBuilderService";
import { Contato } from "../../models/Imovel";
import { MensagemTemplate } from "../../models/Tenant";

const template: MensagemTemplate = {
  nomeCorretor: "Felipe Dias",
  nomeEmpresa: "grupo Imobi",
  cargo: "corretor",
};

describe("MessageBuilderService", () => {
  describe("montarMensagemPreview", () => {
    it("deve montar mensagem para 1 imóvel de venda", () => {
      const contato: Contato = {
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
      };

      const msg = messageBuilderService.montarMensagemPreview(contato, template);

      expect(msg).toContain("{saudação} Denise, tudo bem?");
      expect(msg).toContain("Felipe Dias");
      expect(msg).toContain("corretor do grupo Imobi");
      expect(msg).toContain("a venda do seu imóvel no Landing Home (Apt 303)");
      expect(msg).toContain("Fico à disposição!");
    });

    it("deve montar mensagem para 1 imóvel de locação sem edifício", () => {
      const contato: Contato = {
        nome: "Maria",
        telefone: "5511984334990",
        imoveis: [
          {
            edificio: "",
            endereco: "Afonso Bandeira de Melo",
            numero: "123",
            apartamento: "",
            operacao: "locacao",
            valorVenda: "",
            valorLocacao: "R$8.000,00",
          },
        ],
      };

      const msg = messageBuilderService.montarMensagemPreview(contato, template);

      expect(msg).toContain("a locação do seu imóvel no Afonso Bandeira de Melo, 123");
    });

    it("deve montar mensagem para 1 imóvel de venda e locação", () => {
      const contato: Contato = {
        nome: "Carlos",
        telefone: "5512982584454",
        imoveis: [
          {
            edificio: "PASCAL CAMPO BELO",
            endereco: "PASCAL",
            numero: "1777",
            apartamento: "38",
            operacao: "venda e locacao",
            valorVenda: "R$900.000,00",
            valorLocacao: "R$5.000,00",
          },
        ],
      };

      const msg = messageBuilderService.montarMensagemPreview(contato, template);

      expect(msg).toContain("a venda e locação do seu imóvel no PASCAL CAMPO BELO (Apt 38)");
    });

    it("deve montar mensagem para 2 imóveis com mesma operação", () => {
      const contato: Contato = {
        nome: "Rodrigo",
        telefone: "5511931459333",
        imoveis: [
          {
            edificio: "",
            endereco: "Renascenca",
            numero: "112",
            apartamento: "2",
            operacao: "locacao",
            valorVenda: "",
            valorLocacao: "R$25.000,00",
          },
          {
            edificio: "",
            endereco: "Renascenca",
            numero: "112",
            apartamento: "3",
            operacao: "locacao",
            valorVenda: "",
            valorLocacao: "R$25.000,00",
          },
        ],
      };

      const msg = messageBuilderService.montarMensagemPreview(contato, template);

      expect(msg).toContain("a locação dos seus imóveis");
      expect(msg).toContain("Renascenca, 112 (Apt 2)");
      expect(msg).toContain("Renascenca, 112 (Apt 3)");
    });

    it("deve montar mensagem para 2 imóveis com operações diferentes", () => {
      const contato: Contato = {
        nome: "Carlos",
        telefone: "5512982584454",
        imoveis: [
          {
            edificio: "PASCAL CAMPO BELO",
            endereco: "PASCAL",
            numero: "1777",
            apartamento: "38",
            operacao: "locacao",
            valorVenda: "",
            valorLocacao: "R$5.000,00",
          },
          {
            edificio: "PASCAL CAMPO BELO",
            endereco: "PASCAL",
            numero: "1777",
            apartamento: "27",
            operacao: "venda",
            valorVenda: "R$900.000,00",
            valorLocacao: "",
          },
        ],
      };

      const msg = messageBuilderService.montarMensagemPreview(contato, template);

      expect(msg).toContain("a locação do seu imóvel no PASCAL CAMPO BELO (Apt 38)");
      expect(msg).toContain("a venda do seu imóvel no PASCAL CAMPO BELO (Apt 27)");
    });

    it("deve montar mensagem para 3+ imóveis com mesma operação", () => {
      const contato: Contato = {
        nome: "Paulo",
        telefone: "5511994426567",
        imoveis: [
          {
            edificio: "",
            endereco: "VIEIRA DE MORAIS",
            numero: "1869",
            apartamento: "4",
            operacao: "locacao",
            valorVenda: "",
            valorLocacao: "R$3.000,00",
          },
          {
            edificio: "",
            endereco: "VIEIRA DE MORAIS",
            numero: "1869",
            apartamento: "11",
            operacao: "locacao",
            valorVenda: "",
            valorLocacao: "R$3.000,00",
          },
          {
            edificio: "",
            endereco: "Bernardino de Campos",
            numero: "221",
            apartamento: "",
            operacao: "locacao",
            valorVenda: "",
            valorLocacao: "R$2.500,00",
          },
        ],
      };

      const msg = messageBuilderService.montarMensagemPreview(contato, template);

      expect(msg).toContain("a locação dos seus imóveis");
      expect(msg).toContain("VIEIRA DE MORAIS, 1869 (Apt 4)");
      expect(msg).toContain("VIEIRA DE MORAIS, 1869 (Apt 11)");
      expect(msg).toContain("Bernardino de Campos, 221");
    });
  });

  describe("montarNomeContato", () => {
    it("deve usar edifício quando disponível", () => {
      const contato: Contato = {
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
      };

      expect(messageBuilderService.montarNomeContato(contato)).toBe(
        "Denise - Landing Home (Apt 303)"
      );
    });

    it("deve usar endereço quando não tem edifício", () => {
      const contato: Contato = {
        nome: "Maria",
        telefone: "5511984334990",
        imoveis: [
          {
            edificio: "",
            endereco: "Afonso Bandeira de Melo",
            numero: "123",
            apartamento: "",
            operacao: "locacao",
            valorVenda: "",
            valorLocacao: "R$8.000,00",
          },
        ],
      };

      expect(messageBuilderService.montarNomeContato(contato)).toBe(
        "Maria - Afonso Bandeira de Melo, 123"
      );
    });

    it("deve usar primeiro imóvel quando tem múltiplos", () => {
      const contato: Contato = {
        nome: "Rodrigo",
        telefone: "5511931459333",
        imoveis: [
          {
            edificio: "",
            endereco: "Renascenca",
            numero: "112",
            apartamento: "2",
            operacao: "locacao",
            valorVenda: "",
            valorLocacao: "R$25.000,00",
          },
          {
            edificio: "",
            endereco: "Rua Outra",
            numero: "999",
            apartamento: "",
            operacao: "venda",
            valorVenda: "R$500.000,00",
            valorLocacao: "",
          },
        ],
      };

      expect(messageBuilderService.montarNomeContato(contato)).toBe(
        "Rodrigo - Renascenca, 112 (Apt 2)"
      );
    });
  });

  describe("montarMensagem (com saudação real)", () => {
    it("deve conter saudação válida", () => {
      const contato: Contato = {
        nome: "Denise",
        telefone: "5511990018181",
        imoveis: [
          {
            edificio: "Landing Home",
            endereco: "",
            numero: "",
            apartamento: "",
            operacao: "venda",
            valorVenda: "R$970.000,00",
            valorLocacao: "",
          },
        ],
      };

      const msg = messageBuilderService.montarMensagem(contato, template);

      const temSaudacao =
        msg.startsWith("Bom dia") ||
        msg.startsWith("Boa tarde") ||
        msg.startsWith("Boa noite");
      expect(temSaudacao).toBe(true);
      expect(msg).toContain("Denise, tudo bem?");
    });
  });
});
