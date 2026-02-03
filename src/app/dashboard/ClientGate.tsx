"use client";

import React from "react";
import RequireAdmin from "@/components/auth/RequireAdmin";

export default function ClientGate({ children }: { children: React.ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}