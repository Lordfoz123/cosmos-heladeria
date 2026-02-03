import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const BOOTSTRAP_SECRET = process.env.ADMIN_BOOTSTRAP_SECRET;

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-bootstrap-secret") || "";
    if (!BOOTSTRAP_SECRET || secret !== BOOTSTRAP_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const uid = body?.uid;

    if (!uid || typeof uid !== "string") {
      return NextResponse.json({ error: "UID inválido" }, { status: 400 });
    }

    // ✅ adminAuth es una función: hay que invocarla
    await adminAuth().setCustomUserClaims(uid, { role: "admin" });
    const user = await adminAuth().getUser(uid);

    // ✅ adminDb es una función: hay que invocarla
    await adminDb()
      .collection("users")
      .doc(uid)
      .set(
        {
          uid,
          email: user.email || null,
          role: "admin",
          active: true,
          updatedAt: new Date().toISOString(),
          createdAt: user.metadata?.creationTime || new Date().toISOString(),
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true, uid, role: "admin" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}