import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { LogIn, AlertCircle, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth as firebaseAuth, db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(firebaseAuth, resetEmail);
      setResetSent(true);
    } catch {
      setResetError("Não foi possível enviar o email. Verifique o endereço informado.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowResetPassword(false);
    setResetEmail("");
    setResetSent(false);
    setResetError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPendingMessage("");
    setLoading(true);

    try {
      await login(email, password);

      // Verificar se tem tenant vinculado ou é superadmin
      const uid = firebaseAuth.currentUser?.uid;
      if (uid) {
        const userDoc = await getDoc(doc(db, "users", uid));
        const userData = userDoc.data();

        if (userData?.role === "superadmin") {
          navigate("/admin");
          return;
        }

        if (!userDoc.exists() || !userData?.tenantId) {
          await logout();
          setPendingMessage("Sua conta está aguardando ativação pelo administrador. Você será notificado quando sua conta for liberada.");
          return;
        }
      }

      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao fazer login";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (showResetPassword) {
    return (
      <Container>
        <Card>
          <Logo>PDocSend</Logo>

          {resetSent ? (
            <>
              <ResetSuccessBox>
                <CheckCircle size={40} />
                <ResetSuccessTitle>Email enviado!</ResetSuccessTitle>
                <ResetSuccessText>
                  Enviamos um link de recuperação para <strong>{resetEmail}</strong>.
                  Verifique sua caixa de entrada e spam.
                </ResetSuccessText>
              </ResetSuccessBox>
              <BackLink onClick={handleBackToLogin}>
                <ArrowLeft size={16} />
                Voltar para o login
              </BackLink>
            </>
          ) : (
            <>
              <Subtitle>Recuperar senha</Subtitle>
              <Form onSubmit={handleResetPassword}>
                <InputGroup>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={resetLoading}
                  />
                </InputGroup>

                {resetError && (
                  <ErrorBox>
                    <AlertCircle size={16} />
                    {resetError}
                  </ErrorBox>
                )}

                <Button type="submit" disabled={resetLoading}>
                  <Mail size={18} />
                  {resetLoading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </Form>
              <BackLink onClick={handleBackToLogin}>
                <ArrowLeft size={16} />
                Voltar para o login
              </BackLink>
            </>
          )}
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      {loading && (
        <LoadingOverlay>
          <LogIn size={32} color="#2563eb" className="spin" />
          <LoadingText>Entrando...</LoadingText>
        </LoadingOverlay>
      )}
      <Card>
        <Logo>PDocSend</Logo>
        <Subtitle>Faça login para continuar</Subtitle>

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </InputGroup>

          <InputGroup>
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              disabled={loading}
            />
          </InputGroup>

          {pendingMessage && (
            <PendingBox>
              {pendingMessage}
            </PendingBox>
          )}

          {error && (
            <ErrorBox>
              <AlertCircle size={16} />
              {error}
            </ErrorBox>
          )}

          <ForgotPassword type="button" onClick={() => setShowResetPassword(true)}>
            Esqueceu sua senha?
          </ForgotPassword>

          <Button type="submit" disabled={loading}>
            <LogIn size={18} />
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </Form>

        <RegisterLink>
          Não tem conta? <Link to="/register">Criar conta</Link>
        </RegisterLink>
      </Card>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background};
  padding: 1rem;
  position: relative;
`;

const LoadingOverlay = styled.div`
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
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const Logo = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  text-align: center;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 0.25rem;
`;

const Subtitle = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
  padding: 0.625rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.md};
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const PendingBox = styled.div`
  padding: 0.75rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: #92400e;
  font-size: ${({ theme }) => theme.fontSize.sm};
  text-align: center;
  line-height: 1.5;
`;

const ErrorBox = styled.div`
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

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
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
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ForgotPassword = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 500;
  cursor: pointer;
  text-align: right;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
`;

const RegisterLink = styled.p`
  text-align: center;
  margin-top: 1.5rem;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};

  a {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 600;
  }
`;

const BackLink = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  margin-top: 1.5rem;
  width: 100%;

  &:hover {
    text-decoration: underline;
  }
`;

const ResetSuccessBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  color: ${({ theme }) => theme.colors.success};
`;

const ResetSuccessTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const ResetSuccessText = styled.p`
  text-align: center;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
`;
