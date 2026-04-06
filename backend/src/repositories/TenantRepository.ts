import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { Tenant } from "../models/Tenant";
import { ITenantRepository, PaginatedResult } from "../interfaces";

class TenantRepository implements ITenantRepository {
  private collection = db.collection("tenants");

  async buscarPorId(tenantId: string): Promise<(Tenant & { id: string }) | null> {
    const doc = await this.collection.doc(tenantId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Tenant & { id: string };
  }

  async listarTodos(): Promise<(Tenant & { id: string })[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Tenant & { id: string })[];
  }

  async listarPaginado(limite = 20, cursor?: string): Promise<PaginatedResult<Tenant & { id: string }>> {
    let query = this.collection.orderBy("criadoEm", "desc");

    if (cursor) {
      const cursorDoc = await this.collection.doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.limit(limite + 1).get();
    const docs = snapshot.docs.slice(0, limite);
    const hasMore = snapshot.docs.length > limite;

    return {
      items: docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (Tenant & { id: string })[],
      hasMore,
      nextCursor: hasMore ? docs[docs.length - 1].id : undefined,
    };
  }

  async listarResumo(): Promise<Array<{ id: string; nome: string; limiteDiario: number; mensagemTemplate: Tenant["mensagemTemplate"]; criadoEm: Timestamp }>> {
    const snapshot = await this.collection
      .select("nome", "limiteDiario", "mensagemTemplate", "criadoEm")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome,
        limiteDiario: data.limiteDiario,
        mensagemTemplate: data.mensagemTemplate,
        criadoEm: data.criadoEm,
      };
    });
  }

  async criar(data: Omit<Tenant, "criadoEm">): Promise<string> {
    const ref = this.collection.doc();
    await ref.set({
      ...data,
      criadoEm: Timestamp.now(),
    });
    return ref.id;
  }

  async atualizar(tenantId: string, data: Record<string, unknown>): Promise<void> {
    await this.collection.doc(tenantId).update(data);
  }
}

export default new TenantRepository();
