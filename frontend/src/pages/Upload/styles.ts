import styled from "styled-components";

export const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

export const UploadLoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;

  .spin {
    animation: spin 2s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const LoadingContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
`;

export const LoadingTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.xl};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

export const LoadingText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  line-height: 1.5;
`;

export const DashboardCards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  max-width: 600px;
  margin: 1rem auto;
  padding: 0 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, 1fr);
    padding: 0 1.5rem;
    margin: 1.5rem auto;
  }
`;

export const DashCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: 0.75rem;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 640px) {
    padding: 1rem;
  }
`;

export const DashIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: 0.5rem;
  color: ${(p) =>
    p.$color === "blue" ? "#2563eb" :
    p.$color === "green" ? "#16a34a" :
    p.$color === "purple" ? "#7c3aed" : "#6b7280"};
  background: ${(p) =>
    p.$color === "blue" ? "#eff6ff" :
    p.$color === "green" ? "#f0fdf4" :
    p.$color === "purple" ? "#f5f3ff" : "#f9fafb"};
`;

export const DashInfo = styled.div``;

export const DashValue = styled.div<{ $small?: boolean }>`
  font-size: ${(p) => p.$small ? p.theme.fontSize.sm : "1.25rem"};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

export const DashLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 0.125rem;
`;

export const DashProgress = styled.div`
  height: 4px;
  background: ${({ theme }) => theme.colors.borderLight};
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
`;

export const DashProgressBar = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${(p) => p.$percent}%;
  background: ${(p) => p.$percent > 80 ? "#f59e0b" : p.$percent > 95 ? "#dc2626" : "#2563eb"};
  border-radius: 2px;
  transition: width 0.3s;
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 640px) {
    padding: 1rem 2rem;
  }
`;

export const Logo = styled.h1`
  font-size: 1.25rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

export const HeaderButton = styled.button`
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
  transition: all 0.2s;

  @media (min-width: 640px) {
    padding: 0.5rem 0.75rem;
    font-size: ${({ theme }) => theme.fontSize.sm};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.borderLight};
    color: ${({ theme }) => theme.colors.text};
  }
`;

export const FilterGroup = styled.div`
  margin-bottom: 1rem;
`;

export const FilterLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.5rem;
`;

export const FilterOptions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const FilterOption = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${(p) => p.$active ? p.theme.colors.primary : p.theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${(p) => p.$active ? p.theme.colors.primary : "white"};
  color: ${(p) => p.$active ? "white" : p.theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const Content = styled.main`
  max-width: 600px;
  margin: 1.5rem auto;
  padding: 0 1rem;

  @media (min-width: 640px) {
    margin: 3rem auto;
    padding: 0 1.5rem;
  }
`;

export const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.xxl};
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

export const Description = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.md};
  margin-bottom: 2rem;
  line-height: 1.5;
`;

export const DropZone = styled.div<{ $hasFile: boolean }>`
  border: 2px dashed ${(p) => (p.$hasFile ? "#16a34a" : p.theme.colors.border)};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(p) => (p.$hasFile ? "#f0fdf4" : p.theme.colors.surface)};

  &:hover {
    border-color: ${(p) => (p.$hasFile ? "#16a34a" : p.theme.colors.primary)};
  }
`;

export const DropContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`;

export const DropText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

export const DropSubtext = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const FileInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
`;

export const FileName = styled.span`
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSize.md};
`;

export const FileSize = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

export const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: #991b1b;
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

export const Button = styled.button`
  width: 100%;
  margin-top: 1.5rem;
  padding: 0.875rem;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 600;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
