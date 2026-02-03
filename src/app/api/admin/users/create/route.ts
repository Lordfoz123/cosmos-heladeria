import { NextResponse } from "next/server";
import { adminAuth, adminBucket, adminDb } from "@/lib/firebaseAdmin";

const ALLOWED_ROLES = new Set(["admin", "logistica", "cocina"]);
const MAX_IMAGE_BYTES = 1 * 1024 * 1024; // 1MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function POST(req: Request) {
  try {
    // 1) Validar admin caller
    const token = getBearerToken(req);
    if (!token) return jsonError("Falta Authorization Bearer token", 401);

    const decoded = await adminAuth().verifyIdToken(token);
    const callerRole = (decoded.role as string | undefined) ?? null;
    if (callerRole !== "admin") return jsonError("No autorizado", 403);

    // 2) Leer form-data
    const form = await req.formData();

    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const nombres = String(form.get("nombres") ?? "").trim();
    const apellidos = String(form.get("apellidos") ?? "").trim();
    const telefono = String(form.get("telefono") ?? "").trim();
    const role = String(form.get("role") ?? "").trim();

    if (!email || !isValidEmail(email)) return jsonError("Email inválido");
    if (!password || password.length < 6) return jsonError("Contraseña mínima 6 caracteres");
    if (!nombres) return jsonError("Nombres requerido");
    if (!apellidos) return jsonError("Apellidos requerido");
    if (!ALLOWED_ROLES.has(role)) return jsonError("Rol inválido");

    const displayName = `${nombres} ${apellidos}`.trim();

    // 3) Crear usuario Auth
    const created = await adminAuth().createUser({
      email,
      password,
      displayName,
    });

    // 4) Foto opcional
    let photoURL: string | undefined;

    const maybeFile = form.get("photo");
    if (maybeFile && typeof maybeFile !== "string") {
      const blob = maybeFile as Blob;
      const mime = blob.type || "image/jpeg";
      if (!ALLOWED_MIME.has(mime)) return jsonError("Formato de imagen inválido (JPG/PNG/WEBP)");

      const ab = await blob.arrayBuffer();
      if (ab.byteLength > MAX_IMAGE_BYTES) return jsonError("Imagen demasiado grande (máx 1MB)");

      const ext = extFromMime(mime);
      const path = `users/${created.uid}/avatar.${ext}`;

      const bucket = adminBucket();
      const file = bucket.file(path);

      await file.save(Buffer.from(ab), {
        contentType: mime,
        resumable: false,
        metadata: { cacheControl: "public,max-age=3600" },
      });

      // Signed URL (no requiere bucket público)
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 5,
      });

      photoURL = signedUrl;
    }

    // 5) Actualizar Auth (photoURL)
    await adminAuth().updateUser(created.uid, { photoURL });

    // 6) Claims rol
    await adminAuth().setCustomUserClaims(created.uid, { role });

    // 7) Guardar perfil en Firestore (recomendado)
    await adminDb().collection("users").doc(created.uid).set(
      {
        uid: created.uid,
        email,
        displayName,
        nombres,
        apellidos,
        telefono: telefono || null,
        role,
        photoURL: photoURL || null,
        active: true,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      uid: created.uid,
      email,
      role,
      displayName,
      telefono: telefono || null,
      photoURL: photoURL ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}