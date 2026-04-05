import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { ILoteRepository, CriarLoteData, ContadoresLote } from "../interfaces";

class LoteRepository implements ILoteRepository {
  private getLoteRef(tenantId: string, loteId?: string) {
    const col = db.collection(`tenants/${tenantId}/lotes`);
    return loteId ? col.doc(loteId) : col.doc();
  }

  async buscarPorId(tenantId: string, loteId: string) {
    const doc = await this.getLoteRef(tenantId, loteId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async listarPorTenant(tenantId: string, limite = 20, cursor?: string) {
    let query = db
      .collection(`tenants/${tenantId}/lotes`)
      .orderBy("criadoEm", "desc");

    if (cursor) {
      const cursorDoc = await db.collection(`tenants/${tenantId}/lotes`).doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.limit(limite + 1).get();

    const docs = snapshot.docs.slice(0, limite);
    const hasMore = snapshot.docs.length > limite;
    const nextCursor = hasMore ? docs[docs.length - 1].id : undefined;

    return {
      lotes: docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      hasMore,
      nextCursor,
    };
  }

  async listarDesde(tenantId: string, desde: Timestamp) {
    const snapshot = await db
      .collection(`tenants/${tenantId}/lotes`)
      .where("criadoEm", ">=", desde)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async criar(tenantId: string, data: CriarLoteData): Promise<string> {
    const ref = db.collection(`tenants/${tenantId}/lotes`).doc();
    await ref.set({
      ...data,
      enviados: 0,
      erros: 0,
      status: "em_andamento",
      criadoEm: Timestamp.now(),
      finalizadoEm: null,
    });
    return ref.id;
  }

  async atualizarStatus(tenantId: string, loteId: string, status: string): Promise<void> {
    await this.getLoteRef(tenantId, loteId).update({ status });
  }

  async atualizarContadores(tenantId: string, loteId: string, contadores: Partial<ContadoresLote>): Promise<void> {
    await this.getLoteRef(tenantId, loteId).update(contadores);
  }

  async finalizar(tenantId: string, loteId: string, contadores: ContadoresLote): Promise<void> {
    await this.getLoteRef(tenantId, loteId).update({
      enviados: contadores.enviados,
      erros: contadores.erros,
      status: "finalizado",
      finalizadoEm: Timestamp.now(),
    });
  }

  async listarRecentes(tenantId: string, limite = 5) {
    const snapshot = await db
      .collection(`tenants/${tenantId}/lotes`)
      .orderBy("criadoEm", "desc")
      .limit(limite)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}

export default new LoteRepository();
