import styled from "styled-components";
import { CheckCircle } from "lucide-react";

interface SuccessAlertProps {
  message: string;
  className?: string;
}

export function SuccessAlert({ message, className }: SuccessAlertProps) {
  return (
    <Container className={className} role="status">
      <CheckCircle size={16} aria-hidden="true" />
      {message}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: #16a34a;
  font-size: ${({ theme }) => theme.fontSize.sm};
`;
