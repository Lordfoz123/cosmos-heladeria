import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const qs = await admin.firestore().collection("pedidos").limit(10).get();
console.log("IDs:", qs.docs.map((d) => d.id));
