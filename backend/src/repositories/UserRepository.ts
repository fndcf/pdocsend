import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { User } from "../models/Tenant";

class UserRepository {
  private collection = db.collection("users");

  async buscarPorId(uid: string): Promise<(User & { id: string }) | null> {
    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as User & { id: string };
  }

  async listarPorTenant(): Promise<Record<string, Array<{ uid: string; email: string; nome: string; role: string }>>> {
    const snapshot = await this.collection.where("role", "!=", "superadmin").get();
    const usersByTenant: Record<string, Array<{ uid: string; email: string; nome: string; role: string }>> = {};

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.tenantId) continue;
      if (!usersByTenant[data.tenantId]) usersByTenant[data.tenantId] = [];
      usersByTenant[data.tenantId].push({
        uid: doc.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
      });
    }

    return usersByTenant;
  }

  async listarTodos(): Promise<Map<string, { tenantId: string; role: string }>> {
    const snapshot = await this.collection.get();
    const map = new Map<string, { tenantId: string; role: string }>();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      map.set(doc.id, { tenantId: data.tenantId, role: data.role });
    }
    return map;
  }

  async criar(uid: string, data: Omit<User, "criadoEm">): Promise<void> {
    await this.collection.doc(uid).set({
      ...data,
      criadoEm: Timestamp.now(),
    });
  }
}

export default new UserRepository();
