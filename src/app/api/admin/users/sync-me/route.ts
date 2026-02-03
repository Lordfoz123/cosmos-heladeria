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

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return jsonError("Falta Authorization Bearer token", 401);

    const decoded = await adminAuth().verifyIdToken(token);
    const callerRole = (decoded.role as string | undefined) ?? null;
    if (callerRole !== "admin") return jsonError("No autorizado", 403);

    const uid = decoded.uid;
    const u = await adminAuth().getUser(uid);

    const displayName = u.displayName ?? "";
    const email = u.email ?? "";
    const photoURL = u.photoURL ?? null;

    await adminDb().collection("users").doc(uid).set(
      {
        uid,
        email,
        displayName: displayName || null,
        nombres: null,
        apellidos: null,
        telefono: null,
        photoURL,
        role: "admin",
        active: u.disabled ? false : true,
        disabled: u.disabled,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ uid, email, displayName, photoURL });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}