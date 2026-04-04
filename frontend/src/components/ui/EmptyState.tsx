import { ReactNode } from "react";
import styled from "styled-components";

interface EmptyStateProps {
  children: ReactNode;
}

export function EmptyState({ children }: EmptyStateProps) {
  return <Container>{children}</Container>;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 2rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;
