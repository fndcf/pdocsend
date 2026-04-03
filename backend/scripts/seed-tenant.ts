/**
 * Script para criar tenant e vincular usuario no Firestore
 *
 * Uso:
 *   npx ts-node scripts/seed-tenant.ts \
 *     --uid="UID" \
 *     --nome="Grupo Imobi" \
 *     --corretor="Felipe Dias" \
 *     --empresa="grupo Imobi" \
 *     --cargo="corretor" \
 *     --zapiInstanceId="xxx" \
 *     --zapiToken="xxx"
 */

import { db, auth } from "../src/config/firebase";
import { Timestamp } from "firebase-admin/firestore";

interface Args {
  uid: string;
  nome: string;
  corretor: string;
  empresa: string;
  cargo: string;
  zapiInstanceId: string;
  zapiToken: string;
  zapiClientToken: string;
}

function parseArgs(): Args {
  const args: Record<string, string> = {};

  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--(\w+)="?([^"]*)"?$/);
    if (match) {
      args[match[1]] = match[2];
    }
  }

  const required = [
    "uid",
    "nome",
    "corretor",
    "empresa",
    "cargo",
    "zapiInstanceId",
    "zapiToken",
    "zapiClientToken",
  ];

  for (const key of required) {
    if (!args[key]) {
      console.error(`Parametro --${key} e obrigatorio`);
      console.error(
        '\nUso: npx ts-node scripts/seed-tenant.ts --uid="xxx" --nome="Grupo Imobi" ...'
      );
      process.exit(1);
    }
  }

  return args as unknown as Args;
}

async function main() {
  const args = parseArgs();
  const agora = Timestamp.now();

  console.log("Verificando usuario no Firebase Auth...");

  // Verificar se o usuario existe
  try {
    const userRecord = await auth.getUser(args.uid);
    console.log(`Usuario encontrado: ${userRecord.email}`);

    // Ativar usuario se estiver desativado
    if (userRecord.disabled) {
      await auth.updateUser(args.uid, { disabled: false });
      console.log("Usuario ativado com sucesso!");
    }
  } catch {
    console.error(`Usuario com UID ${args.uid} nao encontrado no Firebase Auth`);
    process.exit(1);
  }

  console.log("\nCriando tenant...");

  // Criar tenant
  const tenantRef = db.collection("tenants").doc();
  await tenantRef.set({
    nome: args.nome,
    zapiInstanceId: args.zapiInstanceId,
    zapiToken: args.zapiToken,
    zapiClientToken: args.zapiClientToken,
    mensagemTemplate: {
      nomeCorretor: args.corretor,
      nomeEmpresa: args.empresa,
      cargo: args.cargo,
    },
    limiteDiario: 200,
    criadoEm: agora,
  });

  console.log(`Tenant criado com ID: ${tenantRef.id}`);

  // Criar/atualizar user
  console.log("\nVinculando usuario ao tenant...");

  const userRecord = await auth.getUser(args.uid);
  await db
    .collection("users")
    .doc(args.uid)
    .set({
      email: userRecord.email || "",
      nome: args.corretor,
      tenantId: tenantRef.id,
      role: "admin",
      criadoEm: agora,
    });

  console.log(`Usuario ${userRecord.email} vinculado ao tenant ${tenantRef.id}`);

  console.log("\n--- RESUMO ---");
  console.log(`Tenant ID: ${tenantRef.id}`);
  console.log(`Tenant Nome: ${args.nome}`);
  console.log(`User UID: ${args.uid}`);
  console.log(`User Email: ${userRecord.email}`);
  console.log(`Z-API Instance: ${args.zapiInstanceId}`);
  console.log(`Corretor: ${args.corretor}`);
  console.log(`Empresa: ${args.empresa}`);
  console.log("\nSetup concluido com sucesso!");

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
