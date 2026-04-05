import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { IEnvioRepository, CriarEnvioData, ContadoresEnvio } from "../interfaces";

class EnvioRepository implements IEnvioRepository {
  private getEnvioRef(tenantId: string, loteId: string, envioId?: string) {
    const col = db.collection(`tenants/${tenantId}/lotes/${loteId}/envios`);
    return envioId ? col.doc(envioId) : col.doc();
  }

  async buscarPorId(tenantId: string, loteId: string, envioId: string) {
    const doc = await this.getEnvioRef(tenantId, loteId, envioId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async listarPorLote(tenantId: string, loteId: string) {
    const snapshot = await db
      .collection(`tenants/${tenantId}/lotes/${loteId}/envios`)
      .orderBy("criadoEm", "asc")
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
    const snapshot = await db
      .collection(`tenants/${tenantId}/lotes/${loteId}/envios`)
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
    const snapshot = await db
      .collection(`tenants/${tenantId}/lotes/${loteId}/envios`)
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
