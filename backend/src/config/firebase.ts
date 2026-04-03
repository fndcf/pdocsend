import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (!admin.apps.length) {
  // Em Cloud Functions, emulators e deploy: inicializa sem credenciais
  // O Firebase resolve automaticamente via Application Default Credentials
  admin.initializeApp();
}

const db = getFirestore();
const auth = getAuth();

db.settings({ ignoreUndefinedProperties: true });

export { db, auth, admin };
