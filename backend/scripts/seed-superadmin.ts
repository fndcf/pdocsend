/**
 * Script para criar superadmin
 *
 * Uso:
 *   npx ts-node scripts/seed-superadmin.ts --uid="UID" --email="email"
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

  if (!args.uid || !args.email) {
    console.error('Uso: npx ts-node scripts/seed-superadmin.ts --uid="UID" --email="email"');
    process.exit(1);
  }

  // Verificar usuario
  try {
    const userRecord = await auth.getUser(args.uid);
    console.log(`Usuario encontrado: ${userRecord.email}`);
  } catch {
    console.error(`Usuario com UID ${args.uid} nao encontrado`);
    process.exit(1);
  }

  // Criar documento superadmin
  await db.collection("users").doc(args.uid).set({
    email: args.email,
    nome: "Super Admin",
    tenantId: "",
    role: "superadmin",
    criadoEm: Timestamp.now(),
  });

  console.log(`Superadmin criado: ${args.email} (${args.uid})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
