import { Router, Request, Response } from "express";
import { db } from "../config/firebase";
import logger from "../utils/logger";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Check Firestore
  const firestoreStart = Date.now();
  try {
    await db.collection("_health").doc("ping").set(
      { timestamp: new Date() },
      { merge: true }
    );
    checks.firestore = {
      status: "ok",
      latencyMs: Date.now() - firestoreStart,
    };
  } catch (error) {
    checks.firestore = {
      status: "error",
      latencyMs: Date.now() - firestoreStart,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "ok");
  const status = allHealthy ? "ok" : "degraded";

  if (!allHealthy) {
    logger.warn("Health check degraded", { checks });
  }

  res.status(allHealthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
