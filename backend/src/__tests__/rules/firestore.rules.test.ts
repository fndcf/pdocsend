/**
 * Testes das Firestore Security Rules
 *
 * Requer emulador Firestore rodando:
 *   firebase emulators:start --only firestore
 *
 * Executar:
 *   npx jest --testPathPattern=rules --watchAll=false
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

const PROJECT_ID = "pdocsend-test";
const RULES_PATH = resolve(__dirname, "../../../../firestore.rules");

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rules = readFileSync(RULES_PATH, "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: "127.0.0.1",
      port: 8280,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// Helper: cria dados iniciais no Firestore via admin
async function seedData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Usuário admin do tenant-1
    await setDoc(doc(db, "users", "user-1"), {
      email: "user1@test.com",
      nome: "User 1",
      tenantId: "tenant-1",
      role: "admin",
    });

    // Usuário admin do tenant-2
    await setDoc(doc(db, "users", "user-2"), {
      email: "user2@test.com",
      nome: "User 2",
      tenantId: "tenant-2",
      role: "admin",
    });

    // Superadmin (sem tenant)
    await setDoc(doc(db, "users", "superadmin-1"), {
      email: "super@test.com",
      nome: "Super Admin",
      tenantId: "",
      role: "superadmin",
    });

    // Tenant 1
    await setDoc(doc(db, "tenants", "tenant-1"), {
      nome: "Tenant 1",
      zapiInstanceId: "xxx",
      zapiToken: "yyy",
      zapiClientToken: "zzz",
      limiteDiario: 200,
    });

    // Tenant 2
    await setDoc(doc(db, "tenants", "tenant-2"), {
      nome: "Tenant 2",
      zapiInstanceId: "aaa",
      zapiToken: "bbb",
      zapiClientToken: "ccc",
      limiteDiario: 100,
    });

    // Lote do tenant-1
    await setDoc(doc(db, "tenants/tenant-1/lotes", "lote-1"), {
      totalEnvios: 5,
      status: "finalizado",
    });

    // Envio do tenant-1
    await setDoc(doc(db, "tenants/tenant-1/lotes/lote-1/envios", "envio-1"), {
      telefone: "5511999001818",
      status: "enviado",
    });

    // Imovel enviado do tenant-1
    await setDoc(doc(db, "tenants/tenant-1/imoveis_enviados", "hash-1"), {
      telefone: "5511999001818",
      edificio: "Landing Home",
    });

    // Lote do tenant-2
    await setDoc(doc(db, "tenants/tenant-2/lotes", "lote-2"), {
      totalEnvios: 3,
      status: "em_andamento",
    });
  });
}

describe("Firestore Security Rules", () => {
  beforeEach(async () => {
    await seedData();
  });

  describe("Usuário não autenticado", () => {
    it("não pode ler users", async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, "users", "user-1")));
    });

    it("não pode ler tenants", async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, "tenants", "tenant-1")));
    });

    it("não pode ler lotes", async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, "tenants/tenant-1/lotes", "lote-1")));
    });
  });

  describe("Users - leitura do próprio documento", () => {
    it("pode ler seu próprio doc", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertSucceeds(getDoc(doc(db, "users", "user-1")));
    });

    it("não pode ler doc de outro usuário", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertFails(getDoc(doc(db, "users", "user-2")));
    });

    it("não pode escrever no seu próprio doc", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertFails(
        setDoc(doc(db, "users", "user-1"), { nome: "Hacked" })
      );
    });
  });

  describe("Tenants - isolamento por tenant", () => {
    it("membro do tenant-1 pode ler tenant-1", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertSucceeds(getDoc(doc(db, "tenants", "tenant-1")));
    });

    it("membro do tenant-1 NÃO pode ler tenant-2", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertFails(getDoc(doc(db, "tenants", "tenant-2")));
    });

    it("membro do tenant-1 não pode escrever no tenant-1", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertFails(
        setDoc(doc(db, "tenants", "tenant-1"), { nome: "Hacked" })
      );
    });
  });

  describe("Lotes - isolamento por tenant", () => {
    it("membro do tenant-1 pode ler lote do tenant-1", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertSucceeds(
        getDoc(doc(db, "tenants/tenant-1/lotes", "lote-1"))
      );
    });

    it("membro do tenant-1 NÃO pode ler lote do tenant-2", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertFails(
        getDoc(doc(db, "tenants/tenant-2/lotes", "lote-2"))
      );
    });

    it("membro do tenant-1 não pode criar lote", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertFails(
        setDoc(doc(db, "tenants/tenant-1/lotes", "lote-novo"), {
          totalEnvios: 1,
        })
      );
    });
  });

  describe("Envios - isolamento por tenant", () => {
    it("membro do tenant-1 pode ler envio do tenant-1", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertSucceeds(
        getDoc(doc(db, "tenants/tenant-1/lotes/lote-1/envios", "envio-1"))
      );
    });

    it("membro do tenant-1 NÃO pode ler envio do tenant-2", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertFails(
        getDoc(doc(db, "tenants/tenant-2/lotes/lote-2/envios", "envio-x"))
      );
    });

    it("membro do tenant-1 não pode escrever envio", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertFails(
        setDoc(doc(db, "tenants/tenant-1/lotes/lote-1/envios", "envio-hack"), {
          telefone: "123",
        })
      );
    });
  });

  describe("Imóveis enviados - isolamento por tenant", () => {
    it("membro do tenant-1 pode ler imoveis_enviados do tenant-1", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertSucceeds(
        getDoc(doc(db, "tenants/tenant-1/imoveis_enviados", "hash-1"))
      );
    });

    it("membro do tenant-1 NÃO pode ler imoveis_enviados do tenant-2", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertFails(
        getDoc(doc(db, "tenants/tenant-2/imoveis_enviados", "hash-x"))
      );
    });
  });

  describe("Superadmin - acesso total de leitura", () => {
    it("pode ler tenant-1", async () => {
      const db = testEnv.authenticatedContext("superadmin-1").firestore();
      await assertSucceeds(getDoc(doc(db, "tenants", "tenant-1")));
    });

    it("pode ler tenant-2", async () => {
      const db = testEnv.authenticatedContext("superadmin-1").firestore();
      await assertSucceeds(getDoc(doc(db, "tenants", "tenant-2")));
    });

    it("pode ler lote de qualquer tenant", async () => {
      const db = testEnv.authenticatedContext("superadmin-1").firestore();
      await assertSucceeds(
        getDoc(doc(db, "tenants/tenant-1/lotes", "lote-1"))
      );
      await assertSucceeds(
        getDoc(doc(db, "tenants/tenant-2/lotes", "lote-2"))
      );
    });

    it("pode ler envio de qualquer tenant", async () => {
      const db = testEnv.authenticatedContext("superadmin-1").firestore();
      await assertSucceeds(
        getDoc(doc(db, "tenants/tenant-1/lotes/lote-1/envios", "envio-1"))
      );
    });

    it("não pode escrever mesmo sendo superadmin", async () => {
      const db = testEnv.authenticatedContext("superadmin-1").firestore();
      await assertFails(
        setDoc(doc(db, "tenants", "tenant-1"), { nome: "Hacked" })
      );
    });
  });

  describe("Colecoes inexistentes - deny by default", () => {
    it("nega acesso a colecão não mapeada nas rules", async () => {
      const db = testEnv.authenticatedContext("user-1").firestore();
      await assertFails(
        setDoc(doc(db, "qualquer_colecao", "doc-1"), { data: "test" })
      );
    });
  });
});
