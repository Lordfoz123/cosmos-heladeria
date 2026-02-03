import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const ALLOWED_ROLES = ["logistica", "cocina", "cliente", "admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

function roleIsAllowed(role: string): role is AllowedRole {
  return (ALLOWED_ROLES as readonly string[]).includes(role);
}

export async function POST(req: Request) {
  try {
    // 1) Verifica que el caller sea admin usando el ID token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token" },
        { status: 401 }
      );
    }

    // ✅ adminAuth es una función: hay que invocarla
    const decoded = await adminAuth().verifyIdToken(token);
    if ((decoded as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    }

    // 2) Body
    const { email, role } = (await req.json()) as { email?: string; role?: string };

    const emailNorm = String(email ?? "").trim().toLowerCase();
    const roleNorm = String(role ?? "").trim().toLowerCase();

    if (!emailNorm || !emailNorm.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (!roleIsAllowed(roleNorm)) {
      return NextResponse.json(
        { error: `Rol inválido. Usa: ${ALLOWED_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // 3) Buscar usuario por email (debe existir porque se logueó con Google al menos 1 vez)
    const user = await adminAuth().getUserByEmail(emailNorm);

    // 4) Set custom claims
    await adminAuth().setCustomUserClaims(user.uid, { role: roleNorm });

    // 5) Guardar en Firestore (útil para listar usuarios/roles en UI)
    await adminDb()
      .collection("users")
      .doc(user.uid)
      .set(
        {
          uid: user.uid,
          email: user.email ?? emailNorm,
          role: roleNorm,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    return NextResponse.json({
      ok: true,
      uid: user.uid,
      email: user.email,
      role: roleNorm,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}