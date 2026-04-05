import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { Tenant } from "../models/Tenant";
import { ITenantRepository } from "../interfaces";

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
