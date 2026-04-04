import { ReactNode } from "react";
import styled from "styled-components";

interface LoadingStateProps {
  children: ReactNode;
}

export function LoadingState({ children }: LoadingStateProps) {
  return <Container>{children}</Container>;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
