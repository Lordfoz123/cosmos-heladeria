/**
 * Borra campos legacy con Ñ en productos:
 * - preciosPorTamaño
 * - recetasPorTamaño
 * - stockPorTamaño (si existe)
 *
 * Requiere GOOGLE_APPLICATION_CREDENTIALS (Firebase Admin).
 */

const admin = require("firebase-admin");

function initAdmin() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function main() {
  initAdmin();
  const db = admin.firestore();

  const snap = await db.collection("productos").get();
  console.log(`Docs encontrados: ${snap.size}`);

  let cleaned = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const ref = docSnap.ref;

    const update = {};
    let hasChanges = false;

    if (data.preciosPorTamaño !== undefined) {
      update["preciosPorTamaño"] = admin.firestore.FieldValue.delete();
      hasChanges = true;
    }
    if (data.recetasPorTamaño !== undefined) {
      update["recetasPorTamaño"] = admin.firestore.FieldValue.delete();
      hasChanges = true;
    }
    if (data.stockPorTamaño !== undefined) {
      update["stockPorTamaño"] = admin.firestore.FieldValue.delete();
      hasChanges = true;
    }

    if (!hasChanges) {
      skipped++;
      continue;
    }

    update.cleanedAt = admin.firestore.FieldValue.serverTimestamp();

    await ref.update(update);
    cleaned++;
    console.log(`🧹 limpiado: ${ref.id}`);
  }

  console.log(`Listo. Cleaned=${cleaned}, Skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});