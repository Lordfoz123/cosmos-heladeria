importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCfJpSrazI6u8geGzWQ9_G4RTnXGcRN8wQ",
  authDomain: "cosmos-heladeria.firebaseapp.com",
  projectId: "cosmos-heladeria",
  storageBucket: "cosmos-heladeria.firebasestorage.app",
  messagingSenderId: "591211953398",
  appId: "1:591211953398:web:d3afac8740e023197b00d7",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Mensaje recibido en background:", payload);

  const title = payload?.notification?.title || "Heladería Cosmos";
  const options = {
    body: payload?.notification?.body || "",
    icon: "/logo192.png",
    // IMPORTANTÍSIMO: guarda data para usarla en notificationclick
    data: payload?.data || {},
  };

  self.registration.showNotification(title, options);
});

// Al hacer click, abre/enfoca la pestaña y navega
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // url viene de la Cloud Function (data.url)
  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Si ya hay una pestaña abierta, la enfocamos y navegamos
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          // navigate puede fallar si el client es cross-origin; por eso try/catch
          try {
            await client.navigate(url);
          } catch (e) {
            // si falla, al menos ya enfocamos
          }
          return;
        }
      }

      // Si no hay pestaña, abrimos una nueva
      await clients.openWindow(url);
    })()
  );
});