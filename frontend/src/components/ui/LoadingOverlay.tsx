import { ReactNode } from "react";
import styled from "styled-components";

interface LoadingOverlayProps {
  children: ReactNode;
}

export function LoadingOverlay({ children }: LoadingOverlayProps) {
  return <Container>{children}</Container>;
}

const Container = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  z-index: 100;

  .spin {
    animation: spin 1.5s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
