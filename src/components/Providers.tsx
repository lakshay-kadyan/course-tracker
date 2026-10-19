"use client";
import type { ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui";
export const Providers = ({ children }: { children: ReactNode }) => <ToastProvider><StoreProvider>{children}</StoreProvider></ToastProvider>;
