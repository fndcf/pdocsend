import styled from "styled-components";

type StatusType = "enviado" | "erro" | "enviando" | "pendente" | "cancelado" |
  "finalizado" | "em_andamento" | "novo" | "ja_enviado";

const colorMap: Record<string, { color: string; bg: string }> = {
  enviado: { color: "#16a34a", bg: "#f0fdf4" },
  finalizado: { color: "#16a34a", bg: "#f0fdf4" },
  novo: { color: "#16a34a", bg: "#f0fdf4" },
  erro: { color: "#dc2626", bg: "#fef2f2" },
  cancelado: { color: "#9ca3af", bg: "#f9fafb" },
  enviando: { color: "#f59e0b", bg: "#fffbeb" },
  em_andamento: { color: "#f59e0b", bg: "#fffbeb" },
  pendente: { color: "#9ca3af", bg: "#f9fafb" },
  ja_enviado: { color: "#9ca3af", bg: "#f9fafb" },
};

export const StatusBadge = styled.span<{ $status: StatusType }>`
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${(p) => colorMap[p.$status]?.color || "#9ca3af"};
  background: ${(p) => colorMap[p.$status]?.bg || "#f9fafb"};
`;
