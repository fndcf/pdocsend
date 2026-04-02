import {
  limparValor,
  campoVazio,
  getSaudacao,
  gerarHashImovel,
} from "../../utils/textUtils";

describe("textUtils", () => {
  describe("limparValor", () => {
    it("deve remover R$ duplicado", () => {
      expect(limparValor("R$R$25.000,00")).toBe("R$25.000,00");
    });

    it("deve retornar vazio para R$0,00", () => {
      expect(limparValor("R$0,00")).toBe("");
    });

    it("deve retornar vazio para R$R$0,00", () => {
      expect(limparValor("R$R$0,00")).toBe("");
    });

    it("deve retornar vazio para R$ 0,00 com espaço", () => {
      expect(limparValor("R$ 0,00")).toBe("");
    });

    it("deve manter valor válido sem R$ duplicado", () => {
      expect(limparValor("R$970.000,00")).toBe("R$970.000,00");
    });

    it("deve manter valor de locação válido", () => {
      expect(limparValor("R$R$8.000,00")).toBe("R$8.000,00");
    });
  });

  describe("campoVazio", () => {
    it('deve retornar true para "-"', () => {
      expect(campoVazio("-")).toBe(true);
    });

    it("deve retornar true para string vazia", () => {
      expect(campoVazio("")).toBe(true);
    });

    it("deve retornar true para undefined", () => {
      expect(campoVazio(undefined)).toBe(true);
    });

    it("deve retornar true para espaços em branco", () => {
      expect(campoVazio("   ")).toBe(true);
    });

    it("deve retornar false para texto válido", () => {
      expect(campoVazio("Landing Home")).toBe(false);
    });

    it('deve retornar true para " - " com espaços', () => {
      expect(campoVazio(" - ")).toBe(true);
    });
  });

  describe("getSaudacao", () => {
    it("deve retornar uma saudação válida", () => {
      const saudacao = getSaudacao();
      expect(["Bom dia", "Boa tarde", "Boa noite"]).toContain(saudacao);
    });
  });

  describe("gerarHashImovel", () => {
    it("deve gerar hash com telefone + edificio + numero + apt", () => {
      const hash = gerarHashImovel(
        "5511990018181",
        "Landing Home",
        "VIEIRA DE MORAIS",
        "1936",
        "303"
      );
      expect(hash).toBe("5511990018181_landing-home_1936_303");
    });

    it("deve usar endereço quando edifício é vazio", () => {
      const hash = gerarHashImovel(
        "5511990018181",
        "",
        "Renascenca",
        "112",
        "2"
      );
      expect(hash).toBe("5511990018181_renascenca_112_2");
    });

    it("deve gerar hash igual para mesmos dados", () => {
      const hash1 = gerarHashImovel("5511990018181", "Ed A", "", "100", "1");
      const hash2 = gerarHashImovel("5511990018181", "Ed A", "", "100", "1");
      expect(hash1).toBe(hash2);
    });

    it("deve gerar hash diferente para apartamentos diferentes", () => {
      const hash1 = gerarHashImovel("5511990018181", "Ed A", "", "100", "1");
      const hash2 = gerarHashImovel("5511990018181", "Ed A", "", "100", "2");
      expect(hash1).not.toBe(hash2);
    });

    it("deve normalizar para lowercase", () => {
      const hash1 = gerarHashImovel("5511990018181", "LANDING HOME", "", "1936", "303");
      const hash2 = gerarHashImovel("5511990018181", "Landing Home", "", "1936", "303");
      expect(hash1).toBe(hash2);
    });
  });
});
