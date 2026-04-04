import { useEffect, useState } from "react";
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Lote, EnvioItem } from "@/types";

interface LoteProgressResult {
  lote: Lote | null;
  loteNotFound: boolean;
  envios: EnvioItem[];
  progresso: number;
  finalizado: boolean;
  cancelados: number;
  pendentes: number;
}

export function useLoteProgress(tenantId: string, loteId: string | undefined): LoteProgressResult {
  const [lote, setLote] = useState<Lote | null>(null);
  const [loteNotFound, setLoteNotFound] = useState(false);
  const [envios, setEnvios] = useState<EnvioItem[]>([]);

  useEffect(() => {
    if (!tenantId || !loteId) return;

    const loteRef = doc(db, `tenants/${tenantId}/lotes`, loteId);
    const unsubscribe = onSnapshot(loteRef, (snap) => {
      if (snap.exists()) {
        setLote({ id: snap.id, ...snap.data() } as Lote);
      } else {
        setLoteNotFound(true);
      }
    });

    return unsubscribe;
  }, [tenantId, loteId]);

  useEffect(() => {
    if (!tenantId || !loteId) return;

    const enviosRef = collection(
      db,
      `tenants/${tenantId}/lotes/${loteId}/envios`
    );
    const q = query(enviosRef, orderBy("criadoEm", "asc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as EnvioItem
      );
      setEnvios(items);
    });

    return unsubscribe;
  }, [tenantId, loteId]);

  const cancelados = envios.filter((e) => e.status === "cancelado").length;
  const pendentes = envios.filter((e) => e.status === "pendente" || e.status === "enviando").length;
  const processados = (lote?.enviados || 0) + (lote?.erros || 0) + cancelados;

  const progresso =
    lote && lote.totalEnvios > 0
      ? Math.round((processados / lote.totalEnvios) * 100)
      : 0;

  const finalizado = lote?.status === "finalizado" || lote?.status === "cancelado";

  return { lote, loteNotFound, envios, progresso, finalizado, cancelados, pendentes };
}
