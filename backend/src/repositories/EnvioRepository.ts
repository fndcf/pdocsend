import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { Envio } from "../models/Envio";
import { IEnvioRepository, CriarEnvioData, ContadoresEnvio } from "../interfaces";

class EnvioRepository implements IEnvioRepository {
  private getEnvioRef(tenantId: string, loteId: string, envioId?: string) {
    const col = db.collection(`tenants/${tenantId}/lotes/${loteId}/envios`);
    return envioId ? col.doc(envioId) : col.doc();
  }

  private getEnvioCollection(tenantId: string, loteId: string) {
    return db.collection(`tenants/${tenantId}/lotes/${loteId}/envios`);
  }

  async buscarPorId(tenantId: string, loteId: string, envioId: string): Promise<(Envio & { id: string }) | null> {
    const doc = await this.getEnvioRef(tenantId, loteId, envioId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Envio & { id: string };
  }

  async listarPorLote(
    tenantId: string,
    loteId: string,
    limite = 100,
    cursor?: string
  ): Promise<{ envios: (Envio & { id: string })[]; hasMore: boolean; nextCursor?: string }> {
    let query = this.getEnvioCollection(tenantId, loteId)
      .orderBy("criadoEm", "asc");

    if (cursor) {
      const cursorDoc = await this.getEnvioRef(tenantId, loteId, cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.limit(limite + 1).get();
    const docs = snapshot.docs.slice(0, limite);
    const hasMore = snapshot.docs.length > limite;

    return {
      envios: docs.map((doc) => ({ id: doc.id, ...doc.data() })) as (Envio & { id: string })[],
      hasMore,
      nextCursor: hasMore ? docs[docs.length - 1].id : undefined,
    };
  }

  async criar(tenantId: string, loteId: string, data: CriarEnvioData): Promise<string> {
    const ref = this.getEnvioRef(tenantId, loteId);
    await ref.set({
      ...data,
      mensagem: data.mensagem || "",
      status: "pendente",
      erro: "",
      enviadoEm: null,
      criadoEm: Timestamp.now(),
    });
    return ref.id;
  }

  async atualizarStatus(
    tenantId: string,
    loteId: string,
    envioId: string,
    status: string,
    extra?: Record<string, unknown>
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status, ...extra };
    await this.getEnvioRef(tenantId, loteId, envioId).update(updateData);
  }

  async marcarEnviado(
    tenantId: string,
    loteId: string,
    envioId: string,
    mensagem: string
  ): Promise<void> {
    await this.getEnvioRef(tenantId, loteId, envioId).update({
      status: "enviado",
      mensagem,
      enviadoEm: Timestamp.now(),
    });
  }

  async marcarErro(
    tenantId: string,
    loteId: string,
    envioId: string,
    erro: string
  ): Promise<void> {
    await this.getEnvioRef(tenantId, loteId, envioId).update({
      status: "erro",
      erro,
    });
  }

  async cancelarPendentes(tenantId: string, loteId: string): Promise<number> {
    const snapshot = await this.getEnvioCollection(tenantId, loteId)
      .where("status", "in", ["pendente", "enviando"])
      .get();

    const batch = db.batch();
    let cancelados = 0;
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { status: "cancelado" });
      cancelados++;
    }
    await batch.commit();
    return cancelados;
  }

  async contarPorStatus(tenantId: string, loteId: string): Promise<ContadoresEnvio> {
    // Usa select() para trazer apenas o campo status, reduzindo bandwidth
    const snapshot = await this.getEnvioCollection(tenantId, loteId)
      .select("status")
      .get();

    let enviados = 0;
    let erros = 0;
    let cancelados = 0;
    for (const doc of snapshot.docs) {
      const status = doc.data().status;
      if (status === "enviado") enviados++;
      else if (status === "erro") erros++;
      else if (status === "cancelado") cancelados++;
    }

    return { enviados, erros, cancelados, total: snapshot.size };
  }
}

export default new EnvioRepository();
