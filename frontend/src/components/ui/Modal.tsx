import { ReactNode, useEffect, useRef } from "react";
import styled from "styled-components";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ onClose, children, maxWidth = "400px" }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Fechar com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus trap: focar no modal ao abrir
  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true">
      <Content
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
        $maxWidth={maxWidth}
        tabIndex={-1}
      >
        {children}
      </Content>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const Content = styled.div<{ $maxWidth: string }>`
  background: white;
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: 1.5rem;
  width: 100%;
  max-width: ${(p) => p.$maxWidth};
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

export const ModalTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: 700;
  margin-bottom: 0.75rem;
`;

export const ModalText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
  margin-bottom: 1.5rem;
`;

export const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

export const ModalCancelButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: white;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.sm};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
  }
`;

export const ModalConfirmButton = styled.button<{ $variant?: "danger" | "primary" }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${(p) =>
    p.$variant === "primary" ? p.theme.colors.primary : p.theme.colors.error};
  color: white;
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.sm};
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;
