import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const ALLOWED_ROLES = new Set(["admin", "logistica", "cocina"]);

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

    const body = await req.json();

    const uid = String(body.uid ?? "").trim();
    const nombres = String(body.nombres ?? "").trim();
    const apellidos = String(body.apellidos ?? "").trim();
    const telefono = String(body.telefono ?? "").trim();
    const role = String(body.role ?? "").trim();

    if (!uid) return jsonError("uid requerido");
    if (!nombres) return jsonError("nombres requerido");
    if (!apellidos) return jsonError("apellidos requerido");
    if (role && !ALLOWED_ROLES.has(role)) return jsonError("Rol inválido");

    const displayName = `${nombres} ${apellidos}`.trim();

    // 1) Actualizar Auth (displayName)
    await adminAuth().updateUser(uid, {
      displayName,
    });

    // 2) Actualizar Firestore (perfil)
    await adminDb()
      .collection("users")
      .doc(uid)
      .set(
        {
          uid,
          nombres,
          apellidos,
          telefono: telefono || null,
          displayName,
          ...(role ? { role } : {}),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    // 3) Si viene role, actualizar claim
    if (role) {
      await adminAuth().setCustomUserClaims(uid, { role });
    }

    return NextResponse.json({ uid, displayName, role: role || null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}