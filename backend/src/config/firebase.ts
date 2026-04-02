import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const isCloudFunction = !!process.env.K_SERVICE;

if (!admin.apps.length) {
  if (isCloudFunction || isEmulator) {
    admin.initializeApp();
  } else {
    const projectId = process.env.FB_PROJECT_ID;
    const clientEmail = process.env.FB_CLIENT_EMAIL;
    const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n");

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
}

const db = getFirestore();
const auth = getAuth();

db.settings({ ignoreUndefinedProperties: true });

export { db, auth, admin };
