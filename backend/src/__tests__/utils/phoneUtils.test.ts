import { normalizarTelefone, extrairNome } from "../../utils/phoneUtils";

describe("phoneUtils", () => {
  describe("normalizarTelefone", () => {
    it("deve adicionar 55 a telefone com 11 dígitos (DDD + número)", () => {
      expect(normalizarTelefone("11990018181")).toBe("5511990018181");
    });

    it("deve manter telefone que já começa com 55", () => {
      expect(normalizarTelefone("5511990018181")).toBe("5511990018181");
    });

    it("deve remover espaços", () => {
      expect(normalizarTelefone("11 99001 8181")).toBe("5511990018181");
    });

    it("deve tratar telefone com 10 dígitos (sem o 9)", () => {
      expect(normalizarTelefone("1199018181")).toBe("5511999018181");
    });

    it("deve tratar telefone com 9 dígitos (sem DDD)", () => {
      expect(normalizarTelefone("990018181")).toBe("5511990018181");
    });

    it("deve remover caracteres não numéricos", () => {
      expect(normalizarTelefone("(11) 99001-8181")).toBe("5511990018181");
    });

    it("deve tratar telefone com DDD diferente de 11", () => {
      expect(normalizarTelefone("12982584454")).toBe("5512982584454");
    });

    it("deve tratar telefone com DDD 82", () => {
      expect(normalizarTelefone("82988440677")).toBe("5582988440677");
    });

    it("deve tratar telefone com DDD 21", () => {
      expect(normalizarTelefone("21999411520")).toBe("5521999411520");
    });

    it("deve tratar telefone com DDD 19", () => {
      expect(normalizarTelefone("19996855258")).toBe("5519996855258");
    });
  });

  describe("extrairNome", () => {
    it("deve remover números do nome", () => {
      expect(extrairNome("Denise 11 99001 8181")).toBe("Denise");
    });

    it("deve remover números colados no nome", () => {
      expect(extrairNome("Antonio Jose 11 99410 6052")).toBe("Antonio Jose");
    });

    it("deve manter nome sem números", () => {
      expect(extrairNome("Larissa Marinho")).toBe("Larissa Marinho");
    });

    it("deve tratar nome todo maiúsculo com números", () => {
      expect(extrairNome("MARIA 98433 4990")).toBe("Maria");
    });

    it("deve limpar espaços extras", () => {
      expect(extrairNome("  Jean  98233 2047  ")).toBe("Jean");
    });

    it("deve tratar nome com prefixo Sr.", () => {
      expect(extrairNome("Sr. Boanesio Borges 99147 1802")).toBe("Sr. Boanesio Borges");
    });

    it("deve tratar nome com parênteses e números", () => {
      expect(extrairNome("Juliana (11) 3077-2277")).toBe("Juliana");
    });
  });
});
