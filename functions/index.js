const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

admin.initializeApp();

exports.notificacionNuevoPedido = onDocumentCreated("pedidos/{pedidoId}", async (event) => {
  const pedidoId = event.params.pedidoId;
  const pedido = event.data?.data();
  if (!pedido) {
    console.log("No se pudo leer event.data");
    return;
  }

  const tokenSnap = await admin.firestore().doc("fcmTokens/admin").get();
  const token = tokenSnap.get("token");
  if (!token) {
    console.log("No hay token en fcmTokens/admin");
    return;
  }

  try {
    const res = await admin.messaging().send({
      token,
      notification: {
        title: "¡Nuevo pedido recibido!",
        body: `Total: S/${pedido.total ?? "-"} - de ${pedido.nombre ?? "cliente"}`,
      },
      data: {
        url: "/dashboard/ventas",
        pedidoId: String(pedidoId),
      },
      webpush: {
        notification: {
          icon: "https://tu-dominio.com/icon-192.png", // opcional (https)
        },
      },
    });

    console.log("Notificación enviada. messageId:", res);
  } catch (e) {
    console.error("Error enviando notificación:", e);
  }
});