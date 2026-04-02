/**
 * Script para ativar usuario e vincular a um tenant existente
 *
 * Uso:
 *   npx ts-node scripts/ativar-usuario.ts --uid="UID" --tenantId="TENANT_ID"
 */

import { db, auth } from "../src/config/firebase";
import { Timestamp } from "firebase-admin/firestore";

async function main() {
  const args: Record<string, string> = {};

  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--(\w+)="?([^"]*)"?$/);
    if (match) {
      args[match[1]] = match[2];
    }
  }

  if (!args.uid || !args.tenantId) {
    console.error("Uso: npx ts-node scripts/ativar-usuario.ts --uid=\"UID\" --tenantId=\"TENANT_ID\"");
    process.exit(1);
  }

  // Verificar tenant
  const tenantDoc = await db.collection("tenants").doc(args.tenantId).get();
  if (!tenantDoc.exists) {
    console.error(`Tenant ${args.tenantId} nao encontrado`);
    process.exit(1);
  }

  // Verificar e ativar usuario
  const userRecord = await auth.getUser(args.uid);
  console.log(`Usuario: ${userRecord.email}`);

  if (userRecord.disabled) {
    await auth.updateUser(args.uid, { disabled: false });
    console.log("Conta ativada!");
  }

  // Criar documento do user
  await db.collection("users").doc(args.uid).set({
    email: userRecord.email || "",
    nome: userRecord.displayName || userRecord.email || "",
    tenantId: args.tenantId,
    role: "usuario",
    criadoEm: Timestamp.now(),
  });

  const tenantData = tenantDoc.data();
  console.log(`Vinculado ao tenant: ${tenantData?.nome} (${args.tenantId})`);
  console.log("Pronto!");

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
