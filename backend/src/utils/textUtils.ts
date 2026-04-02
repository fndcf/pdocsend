/**
 * Limpa valor monetário do PDF
 * "R$R$25.000,00" -> "R$25.000,00"
 * "R$0,00" -> ""
 * "R$R$0,00" -> ""
 */
export function limparValor(valor: string): string {
  // Remove R$ duplicado
  let limpo = valor.replace(/R\$R\$/g, "R$").trim();

  // Se é R$0,00 considera vazio
  if (limpo === "R$0,00" || limpo === "R$ 0,00") {
    return "";
  }

  return limpo;
}

/**
 * Verifica se um campo é considerado vazio
 * "-" ou vazio = sem valor
 */
export function campoVazio(valor: string | undefined): boolean {
  if (!valor) return true;
  const trimmed = valor.trim();
  return trimmed === "" || trimmed === "-";
}

/**
 * Retorna a saudação baseada no horário (fuso de Brasília)
 */
export function getSaudacao(): string {
  const now = new Date();
  const brasiliaOffset = -3 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const brasiliaMs = utcMs + brasiliaOffset * 60000;
  const hora = new Date(brasiliaMs).getHours();

  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Gera hash para deduplicação de imóvel
 */
export function gerarHashImovel(
  telefone: string,
  edificio: string,
  endereco: string,
  numero: string,
  apartamento: string
): string {
  const partes = [
    telefone,
    edificio || endereco,
    numero,
    apartamento,
  ].map((p) => (p || "").trim().toLowerCase());

  return partes.join("_").replace(/\s+/g, "-");
}
