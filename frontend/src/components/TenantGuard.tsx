import React from "react";
import styled from "styled-components";
import { AlertCircle, Loader } from "lucide-react";

interface TenantGuardProps {
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}

export function TenantGuard({ loading, error, children }: TenantGuardProps) {
  if (loading) {
    return (
      <StateContainer>
        <Loader size={32} className="spin" />
        <p>Carregando...</p>
      </StateContainer>
    );
  }

  if (error) {
    return (
      <StateContainer>
        <ErrorBox>
          <AlertCircle size={24} />
          <ErrorText>{error}</ErrorText>
        </ErrorBox>
      </StateContainer>
    );
  }

  return <>{children}</>;
}

const StateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 2rem;
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

const ErrorBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: #991b1b;
  max-width: 400px;
  text-align: center;
`;

const ErrorText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  line-height: 1.5;
`;
