/**
 * Migra campos con Ñ a sin Ñ en la colección "productos"
 * - preciosPorTamaño  -> preciosPorTamano
 * - recetasPorTamaño  -> recetasPorTamano
 * - stockPorTamaño    -> stockPorTamano (si existe)
 *
 * Requiere Firebase Admin.
 * Recomendado: definir GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de service account.
 */

const admin = require("firebase-admin");

const DELETE_OLD_FIELDS = false; // pon true solo cuando confirmes que todo quedó OK

function initAdmin() {
  // Si ya se inicializó, no volver a hacerlo
  if (admin.apps.length) return;

  // ✅ Opción recomendada: usa GOOGLE_APPLICATION_CREDENTIALS
  // Debes correr el script con esa variable cargada (desde .env o exportada en tu shell)
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function main() {
  initAdmin();

  const db = admin.firestore();
  const snap = await db.collection("productos").get();

  console.log(`Docs encontrados: ${snap.size}`);

  let updated = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const ref = docSnap.ref;

    const update = {};

    if (!data.preciosPorTamano && data.preciosPorTamaño) {
      update.preciosPorTamano = data.preciosPorTamaño;
      if (DELETE_OLD_FIELDS) update["preciosPorTamaño"] = admin.firestore.FieldValue.delete();
    }

    if (!data.recetasPorTamano && data.recetasPorTamaño) {
      update.recetasPorTamano = data.recetasPorTamaño;
      if (DELETE_OLD_FIELDS) update["recetasPorTamaño"] = admin.firestore.FieldValue.delete();
    }

    if (!data.stockPorTamano && data.stockPorTamaño) {
      update.stockPorTamano = data.stockPorTamaño;
      if (DELETE_OLD_FIELDS) update["stockPorTamaño"] = admin.firestore.FieldValue.delete();
    }

    if (Object.keys(update).length === 0) {
      skipped++;
      continue;
    }

    update.migratedAt = admin.firestore.FieldValue.serverTimestamp();

    await ref.update(update);
    updated++;
    console.log(`✅ actualizado: ${ref.id}`);
  }

  console.log(`Listo. Updated=${updated}, Skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});