import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { Imovel } from "../models/Imovel";
import { gerarHashImovel } from "../utils/textUtils";

class ImovelEnviadoRepository {
  private getCollection(tenantId: string) {
    return db.collection(`tenants/${tenantId}/imoveis_enviados`);
  }

  async buscarHashesExistentes(tenantId: string, hashes: string[]): Promise<Set<string>> {
    const existentes = new Set<string>();
    if (hashes.length === 0) return existentes;

    const BATCH_SIZE = 30;
    for (let i = 0; i < hashes.length; i += BATCH_SIZE) {
      const batch = hashes.slice(i, i + BATCH_SIZE);
      const snapshot = await this.getCollection(tenantId)
        .where("__name__", "in", batch)
        .get();

      for (const doc of snapshot.docs) {
        existentes.add(doc.id);
      }
    }

    return existentes;
  }

  async registrarEnviados(
    tenantId: string,
    telefone: string,
    imoveis: Imovel[],
    loteId: string,
    envioId: string
  ): Promise<void> {
    const batch = db.batch();
    const agora = Timestamp.now();

    for (const imovel of imoveis) {
      const hash = gerarHashImovel(
        telefone,
        imovel.edificio,
        imovel.endereco,
        imovel.numero,
        imovel.apartamento
      );

      const ref = this.getCollection(tenantId).doc(hash);
      batch.set(ref, {
        telefone,
        edificio: imovel.edificio,
        endereco: imovel.endereco,
        numero: imovel.numero,
        apartamento: imovel.apartamento,
        loteId,
        envioId,
        enviadoEm: agora,
      });
    }

    await batch.commit();
  }

  async limparAntigos(tenantId: string, anteriorA: Timestamp): Promise<number> {
    const snapshot = await this.getCollection(tenantId)
      .where("enviadoEm", "<", anteriorA)
      .limit(500)
      .get();

    if (snapshot.empty) return 0;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    return snapshot.size;
  }

  async buscarPorTelefone(tenantId: string, telefone: string) {
    const snapshot = await this.getCollection(tenantId)
      .where("telefone", "==", telefone)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}

export default new ImovelEnviadoRepository();
