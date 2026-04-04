import styled from "styled-components";
import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  message: string;
  className?: string;
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <Container className={className}>
      <AlertCircle size={16} />
      {message}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: #991b1b;
  font-size: ${({ theme }) => theme.fontSize.sm};
`;
