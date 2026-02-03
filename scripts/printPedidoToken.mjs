import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const pedidoId = process.argv[2];
if (!pedidoId) {
  console.error("Uso: node scripts/printPedidoToken.mjs <pedidoId>");
  process.exit(1);
}

const snap = await admin.firestore().collection("pedidos").doc(pedidoId).get();
if (!snap.exists) {
  console.error("Pedido no encontrado:", pedidoId);
  process.exit(1);
}

console.log("pedidoId:", pedidoId);
console.log("accessToken:", snap.data()?.accessToken);
