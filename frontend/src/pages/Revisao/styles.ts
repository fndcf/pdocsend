import styled from "styled-components";
import { ErrorAlert } from "@/components/ui";

export const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
  padding-bottom: 5rem;
`;

export const StyledErrorAlert = styled(ErrorAlert)`
  max-width: 800px;
  margin: 1rem auto;
  padding: 0.75rem 1rem;
`;

export const Resumo = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;

  @media (min-width: 640px) {
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    padding: 1.5rem 2rem;
  }
`;

export const ResumoItem = styled.div`
  text-align: center;
  padding: 0.75rem 0.5rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  @media (min-width: 640px) {
    padding: 1rem;
  }
`;

export const ResumoNumber = styled.div<{ $color?: string }>`
  font-size: 1.25rem;
  font-weight: 800;

  @media (min-width: 640px) {
    font-size: 1.75rem;
  }
  color: ${(p) =>
    p.$color === "green"
      ? "#16a34a"
      : p.$color === "gray"
        ? "#9ca3af"
        : p.theme.colors.text};
`;

export const ResumoLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 0.25rem;

  @media (min-width: 640px) {
    font-size: ${({ theme }) => theme.fontSize.sm};
  }
`;

export const Section = styled.section`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem;

  @media (min-width: 640px) {
    padding: 0 2rem;
  }
`;

export const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
`;

export const ContatoCard = styled.div<{ $disabled?: boolean }>`
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};

  @media (min-width: 640px) {
    padding: 1rem;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const CardLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ContatoNomeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

export const ContatoNome = styled.div`
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.md};
`;

export const EditNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

export const EditNameInput = styled.input`
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.md};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  padding: 0.125rem 0.375rem;
  outline: none;
  width: 200px;
`;

export const EditNameButton = styled.button<{ $cancel?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.25rem;
  background: none;
  border: none;
  color: ${(p) => p.$cancel ? p.theme.colors.error : p.theme.colors.textSecondary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
    color: ${(p) => p.$cancel ? p.theme.colors.error : p.theme.colors.primary};
  }
`;

export const TelefoneRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.125rem;
`;

export const ContatoTelefone = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const HistoricoLink = styled.button`
  display: flex;
  align-items: center;
  padding: 0.125rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  opacity: 0.6;

  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export const ImoveisList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.625rem;
  padding-top: 0.625rem;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
`;

export const ImovelTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: ${({ theme }) => theme.colors.borderLight};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSize.xs};
`;

export const OperacaoTag = styled.span<{ $op: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  font-size: 0.625rem;
  font-weight: 700;
  color: white;
  background: ${(p) =>
    p.$op === "venda"
      ? "#2563eb"
      : p.$op === "locacao"
        ? "#16a34a"
        : "#f59e0b"};
`;

export const ContatoActions = styled.div`
  display: flex;
  gap: 0.25rem;
`;

export const ActionButton = styled.button<{ $danger?: boolean }>`
  padding: 0.375rem;
  background: none;
  border: none;
  color: ${(p) =>
    p.$danger ? p.theme.colors.error : p.theme.colors.textSecondary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
  }
`;

export const PreviewBox = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

export const PreviewTextarea = styled.textarea`
  width: 100%;
  border: none;
  background: transparent;
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  color: ${({ theme }) => theme.colors.text};
`;

export const Footer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem 2rem;
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: center;
`;

export const ConfirmButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  background: ${({ theme }) => theme.colors.success};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 600;
  transition: opacity 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
