import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return jsonError("Falta Authorization Bearer token", 401);

    const decoded = await adminAuth().verifyIdToken(token);
    const callerRole = (decoded.role as string | undefined) ?? null;
    if (callerRole !== "admin") return jsonError("No autorizado", 403);

    const snap = await adminDb()
      .collection("users")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const users = snap.docs.map((d) => d.data());

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}