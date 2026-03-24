"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/hooks/useTheme";

export default function ThemedToaster() {
  const theme = useTheme();
  return <Toaster position="bottom-right" theme={theme} richColors />;
}
