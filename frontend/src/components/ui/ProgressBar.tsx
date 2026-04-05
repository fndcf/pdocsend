import styled from "styled-components";

interface ProgressBarProps {
  percent: number;
  done?: boolean;
  height?: number;
}

export function ProgressBar({ percent, done = false, height = 8 }: ProgressBarProps) {
  return (
    <Background $height={height} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <Fill $percent={percent} $done={done} $height={height} />
    </Background>
  );
}

const Background = styled.div<{ $height: number }>`
  height: ${(p) => p.$height}px;
  background: ${({ theme }) => theme.colors.borderLight};
  border-radius: ${(p) => p.$height / 2}px;
  overflow: hidden;
`;

const Fill = styled.div<{ $percent: number; $done: boolean; $height: number }>`
  height: 100%;
  width: ${(p) => p.$percent}%;
  background: ${(p) => (p.$done ? "#16a34a" : p.theme.colors.primary)};
  border-radius: ${(p) => p.$height / 2}px;
  transition: width 0.5s ease;
`;
