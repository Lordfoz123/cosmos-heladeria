"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

const ORDERS_COLLECTION = "pedidos";

export function usePendingOrdersCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where("estado", "==", "en espera")
    );

    return onSnapshot(q, (snap) => setCount(snap.size));
  }, []);

  return count;
}