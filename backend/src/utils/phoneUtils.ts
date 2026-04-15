/**
 * Normaliza telefone para formato 5511XXXXXXXXX
 */
export function normalizarTelefone(telefone: string): string {
  // Remove tudo que não é dígito
  const digits = telefone.replace(/\D/g, "");

  // Se começa com 55, já tem código do país
  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }

  // Se tem 11 dígitos (DDD + número), adiciona 55
  if (digits.length === 11) {
    return `55${digits}`;
  }

  // Se tem 10 dígitos (DDD + número sem 9), adiciona 55 e 9
  if (digits.length === 10) {
    const ddd = digits.substring(0, 2);
    const numero = digits.substring(2);
    return `55${ddd}9${numero}`;
  }

  // Se tem 9 dígitos (sem DDD), assume 11 (SP)
  if (digits.length === 9) {
    return `5511${digits}`;
  }

  // Não encaixa em nenhum padrão válido — descarta
  return "";
}

/**
 * Extrai apenas o nome (letras e espaços) removendo números e artefatos
 * e capitaliza cada palavra
 * "Antonio Jose 11 99410 6052" -> "Antonio Jose"
 * "MAURA 98425 2543" -> "Maura"
 * "Juliana (11) 3077-2277" -> "Juliana"
 * "PAULO 99442 6567" -> "Paulo"
 * "Ana Elena Borelli 11 94729 3971" -> "Ana Elena Borelli"
 */
export function extrairNome(proprietario: string): string {
  const limpo = proprietario
    .replace(/\d/g, "")           // remove números
    .replace(/[()/-]/g, "")       // remove (), /, -
    .replace(/\s+/g, " ")
    .trim();

  return capitalizarNome(limpo);
}

/**
 * Capitaliza cada palavra do nome
 * "ANTONIO JOSE" -> "Antonio Jose"
 * "maura" -> "Maura"
 * "Sr. Boanesio Borges" -> "Sr. Boanesio Borges"
 * "AC RAILANE" -> "Ac Railane"
 */
function capitalizarNome(nome: string): string {
  return nome
    .split(" ")
    .map((palavra) => {
      if (palavra.length <= 1) return palavra.toUpperCase();
      return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
    })
    .join(" ");
}
