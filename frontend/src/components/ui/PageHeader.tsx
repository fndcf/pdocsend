import { ReactNode } from "react";
import styled from "styled-components";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string | ReactNode;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, onBack, backLabel = "Voltar", actions }: PageHeaderProps) {
  return (
    <Header>
      {onBack && (
        <BackButton onClick={onBack}>
          <ArrowLeft size={18} />
          {backLabel}
        </BackButton>
      )}
      <HeaderTitle>{title}</HeaderTitle>
      {actions}
    </Header>
  );
}

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 640px) {
    gap: 1rem;
    padding: 1rem 2rem;
  }
`;

const HeaderTitle = styled.h1`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 700;
  flex: 1;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (min-width: 640px) {
    font-size: ${({ theme }) => theme.fontSize.lg};
  }
`;

export const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: 500;
  flex-shrink: 0;

  @media (min-width: 640px) {
    padding: 0.5rem 0.75rem;
    font-size: ${({ theme }) => theme.fontSize.sm};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
  }
`;
