import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface UseTenantReturn {
  tenantId: string | null;
  role: string | null;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useTenant(): UseTenantReturn {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRole(data?.role || "admin");

          if (data?.role === "superadmin") {
            setTenantId(null);
            setError(null);
          } else if (data?.tenantId) {
            setTenantId(data.tenantId);
            setError(null);
          } else {
            setError("Sua conta ainda não foi vinculada a uma empresa. Entre em contato com o administrador.");
          }
        } else {
          setError("Sua conta ainda não foi configurada. Entre em contato com o administrador.");
        }
        setLoading(false);
      },
      () => {
        setError("Erro ao carregar dados da conta.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { tenantId, role, isSuperAdmin: role === "superadmin", loading, error };
}
