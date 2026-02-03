import { NextResponse } from "next/server";
import { adminBucket, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pedidoId: string }> }
) {
  const { pedidoId } = await params;
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "");
  const path = String(body?.path ?? "");

  if (!pedidoId) return NextResponse.json({ error: "pedidoId requerido" }, { status: 400 });
  if (!token) return NextResponse.json({ error: "token requerido" }, { status: 400 });
  if (!path.startsWith(`vouchers/${pedidoId}/`)) {
    return NextResponse.json({ error: "path inválido" }, { status: 400 });
  }

  const db = adminDb();
  const ref = db.collection("pedidos").doc(pedidoId);
  const snap = await ref.get();

  if (!snap.exists) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const data = snap.data() as any;
  if (data?.accessToken !== token) {
    return NextResponse.json({ error: "Link inválido o expirado" }, { status: 403 });
  }

  const previousPath = String(data?.voucher?.path ?? "");

  // ✅ actualiza pedido
  await ref.update({
    "voucher.status": "uploaded",
    "voucher.path": path,
    "voucher.uploadedAt": FieldValue.serverTimestamp(),
    estadoPago: "voucher_subido",
  });

  // ✅ borra anterior (best-effort)
  if (previousPath && previousPath !== path) {
    try {
      await adminBucket().file(previousPath).delete({ ignoreNotFound: true });
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true });
}