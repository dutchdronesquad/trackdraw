"use client";

import { useEffect } from "react";
import { useEditor } from "@/store/editor";
import { decodeDesign } from "@/lib/share";
import { useParams } from "next/navigation";

export function useShareUrl() {
  const replaceDesign = useEditor((s) => s.replaceDesign);
  const params = useParams<{ token?: string }>();

  useEffect(() => {
    const token = params?.token;
    if (!token) return;
    const design = decodeDesign(token);
    if (design) {
      replaceDesign(design);
    }
  }, [params?.token, replaceDesign]);
}
