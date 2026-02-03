// src/components/AdminPushPermission.tsx
import { useEffect } from "react";
import { getMessaging, getToken } from "firebase/messaging";
import { initializeApp, getApps } from "firebase/app";
import { saveAdminTokenFCM } from "@/lib/saveAdminTokenFCM";

const firebaseConfig = {
  apiKey: "AIzaSyCfJpSrazI6u8geGzWQ9_G4RTnXGcRN8wQ",
  authDomain: "cosmos-heladeria.firebaseapp.com",
  projectId: "cosmos-heladeria",
  storageBucket: "cosmos-heladeria.firebasestorage.app",
  messagingSenderId: "591211953398",
  appId: "1:591211953398:web:d3afac8740e023197b00d7",
};

const VAPID_KEY =
  "BEf8Yv5__war3-HCbb47Tu3zsuuEidtgwvRmynzNhOfd8_l7EqhUfHUzvHBTk6Fc7uCf36-C4z96Gpm78FuR0WE";

export default function AdminPushPermission() {
  useEffect(() => {
    console.log("useEffect ejecutado");
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      console.log("Service worker soportado");
      navigator.serviceWorker.register("/firebase-messaging-sw.js").then(() => {
        console.log("Service worker registrado");
        Notification.requestPermission().then(async (permission) => {
          console.log("PERMISO:", permission);

          if (permission === "granted") {
            try {
              const app =
                getApps().length > 0
                  ? getApps()[0]
                  : initializeApp(firebaseConfig);
              const messaging = getMessaging(app);

              const currentToken = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: await navigator.serviceWorker.ready,
              });
              console.log("currentToken:", currentToken);
              if (currentToken) {
                await saveAdminTokenFCM(currentToken);
                console.log("Token FCM guardado para admin:", currentToken);
              } else {
                console.warn("NO se pudo obtener token FCM.");
              }
            } catch (e) {
              console.error("Error obteniendo o guardando token FCM:", e);
            }
          } else {
            alert("Debes permitir notificaciones para recibir avisos de pedidos.");
          }
        });
      });
    }
  }, []);

  return null;
}