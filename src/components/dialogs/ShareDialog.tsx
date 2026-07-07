"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SidebarDialog,
  type SidebarDialogNavItem,
} from "@/components/SidebarDialog";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/store/editor";
import {
  buildStoredEmbedPath,
  buildStoredSharePath,
  encodeDesign,
} from "@/lib/share";
import { parseEditorView } from "@/lib/editor/view";
import { authClient } from "@/lib/auth-client";
import {
  GALLERY_DESCRIPTION_MAX_LENGTH,
  GALLERY_DESCRIPTION_MIN_LENGTH,
  canSubmitGalleryListing as canSubmitGalleryListingForm,
  canSubmitGalleryMetadataUpdate as canSubmitGalleryMetadataUpdateForm,
  isGalleryDescriptionValid,
  isGalleryTitleValid,
} from "@/lib/gallery/validation";
import {
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Share2,
  Link2,
  Boxes,
  ImageIcon,
  Ban,
  Loader2,
  EyeOff,
  Sparkles,
  Trash2,
  Code2,
  Route,
  Orbit,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GalleryPreviewRenderer = dynamic(
  () =>
    import("@/components/gallery/GalleryPreviewRenderer").then(
      (mod) => mod.GalleryPreviewRenderer
    ),
  { ssr: false }
);

type GalleryState = "unlisted" | "listed" | "featured" | "hidden";

type ActiveShare = {
  url: string;
  shareToken: string;
  shareType: "temporary" | "published";
  expiresInDays: 7 | 30 | 90 | null;
  galleryState: GalleryState;
  galleryTitle: string;
  galleryDescription: string;
};

type Tab = "share" | "embed" | "gallery" | "actions";

const SHARE_EXPIRY_OPTIONS = [
  { value: 7 as const },
  { value: 30 as const },
  { value: 90 as const },
];

const LS_ANON_SHARE_KEY = "trackdraw-anon-share";

function inferExpiryDays(expiresAt: string | null): 7 | 30 | 90 | null {
  if (!expiresAt) return null;
  const days = Math.max(
    1,
    Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    )
  );
  return days <= 7 ? 7 : days <= 30 ? 30 : 90;
}

function parseGalleryState(raw: string | null | undefined): GalleryState {
  if (raw === "listed" || raw === "featured" || raw === "hidden") return raw;
  return "unlisted";
}

type AnonShare = {
  url: string;
  shareToken: string;
  designToken: string;
  expiresInDays: 7 | 30 | 90 | null;
};

function readAnonShare(): AnonShare | null {
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(LS_ANON_SHARE_KEY)
        : null;
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<AnonShare>;
    if (
      typeof p.url !== "string" ||
      typeof p.shareToken !== "string" ||
      typeof p.designToken !== "string"
    )
      return null;
    return p as AnonShare;
  } catch {
    return null;
  }
}

function writeAnonShare(share: AnonShare) {
  try {
    window.localStorage.setItem(LS_ANON_SHARE_KEY, JSON.stringify(share));
  } catch {
    /* quota */
  }
}

function clearAnonShare() {
  try {
    window.localStorage.removeItem(LS_ANON_SHARE_KEY);
  } catch {
    /* ignore */
  }
}

function buildIframeCode(embedUrl: string, title: string) {
  return `<iframe src="${embedUrl}" title="${title}" loading="lazy" style="width:100%;height:600px;border:0;" allowfullscreen></iframe>`;
}

const shareDialogButtonClassName =
  "h-9 cursor-pointer rounded-lg px-3 text-sm shadow-none";
const shareDialogSmallButtonClassName =
  "h-8 cursor-pointer rounded-lg px-3 text-xs shadow-none";

const PREVIEW_MAX_W = 960;
const PREVIEW_MAX_H = 540;
const PREVIEW_QUALITY = 0.72;

async function convertPngToWebp(dataUrl: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to load preview image"));
    el.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  const scale = Math.min(1, PREVIEW_MAX_W / sw, PREVIEW_MAX_H / sh);
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const webp = canvas.toDataURL("image/webp", PREVIEW_QUALITY);
  if (!webp.startsWith("data:image/webp"))
    throw new Error("WebP encoding failed");
  return webp;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPath?: boolean;
  projectId?: string | null;
  onExportJson?: () => void;
  onSharePublished?: () => void;
  existingShareMode?: boolean;
}

export default function ShareDialog({
  open,
  onOpenChange,
  hasPath = false,
  projectId = null,
  onExportJson,
  onSharePublished,
  existingShareMode = false,
}: ShareDialogProps) {
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  const design = useEditor((s) => s.track.design);
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();

  const isAuthenticated = !!session?.user;
  const userId = session?.user?.id ?? null;
  const displayName = session?.user?.name?.trim() ?? "";
  const displayNameValid = displayName.length > 0;
  const currentView = parseEditorView(searchParams.get("view")) ?? "2d";
  const currentDesignToken = encodeDesign(design);
  const hostname =
    typeof window !== "undefined" ? window.location.host : "trackdraw.app";
  const currentShareUrl =
    typeof window !== "undefined" ? window.location.href : null;
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const [activeTab, setActiveTab] = useState<Tab>("share");
  const [share, setShare] = useState<ActiveShare | null>(null);
  const [loadDone, setLoadDone] = useState(false);
  const [publishedDesignToken, setPublishedDesignToken] = useState<
    string | null
  >(null);
  const [expiresInDays, setExpiresInDays] = useState<7 | 30 | 90>(90);
  const [publishing, setPublishing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [galleryUpdating, setGalleryUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [embedView, setEmbedView] = useState<"2d" | "3d">(currentView);
  const [showGalleryForm, setShowGalleryForm] = useState(false);
  const [confirmRemoveFromGallery, setConfirmRemoveFromGallery] =
    useState(false);
  const [galleryTitleInput, setGalleryTitleInput] = useState("");
  const [galleryDescriptionInput, setGalleryDescriptionInput] = useState("");
  const [galleryPreviewDataUrl, setGalleryPreviewDataUrl] = useState<
    string | null
  >(null);

  const abortRef = useRef<AbortController | null>(null);

  const shareNeedsRefresh =
    share !== null &&
    publishedDesignToken !== null &&
    publishedDesignToken !== currentDesignToken;
  const expiryNeedsRefresh =
    share !== null &&
    share.shareType === "temporary" &&
    share.expiresInDays !== null &&
    expiresInDays !== share.expiresInDays;
  const linkNeedsRefresh = shareNeedsRefresh || expiryNeedsRefresh;
  const showExpirySelector = !isAuthenticated;
  const embedUrl =
    share?.shareType === "published"
      ? new URL(
          buildStoredEmbedPath(share.shareToken, embedView),
          typeof window !== "undefined"
            ? window.location.origin
            : "https://trackdraw.app"
        ).toString()
      : null;
  const iframeCode = embedUrl
    ? buildIframeCode(embedUrl, t("share.embed.iframeTitle"))
    : null;

  const isGalleryVisible =
    share?.galleryState === "listed" || share?.galleryState === "featured";
  const blockedByModeration = share?.galleryState === "hidden";
  const showEmbedSection = isAuthenticated && !existingShareMode;
  const isAccountProjectShare = isAuthenticated && !!projectId;

  const galleryTitleValid = isGalleryTitleValid(galleryTitleInput);
  const galleryDescriptionValid = isGalleryDescriptionValid(
    galleryDescriptionInput
  );
  const hasGalleryMetadataChanges =
    share !== null &&
    (galleryTitleInput.trim() !== share.galleryTitle.trim() ||
      galleryDescriptionInput.trim() !== share.galleryDescription.trim());
  const canSubmitGalleryListing = canSubmitGalleryListingForm({
    title: galleryTitleInput,
    description: galleryDescriptionInput,
    displayNameValid,
    shareNeedsRefresh,
    hasShare: share !== null,
    previewReady: galleryPreviewDataUrl !== null,
  });
  const canSubmitGalleryMetadataUpdate = canSubmitGalleryMetadataUpdateForm({
    title: galleryTitleInput,
    description: galleryDescriptionInput,
    hasShare: share !== null,
    hasMetadataChanges: hasGalleryMetadataChanges,
  });

  const busy = publishing || revoking || galleryUpdating;

  useEffect(() => {
    if (!open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShare(null);
    setLoadDone(false);
    setPublishedDesignToken(null);
    setShowGalleryForm(false);
    setConfirmRemoveFromGallery(false);
    setGalleryPreviewDataUrl(null);

    if (existingShareMode) {
      setLoadDone(true);
      return;
    }

    const ac = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ac;

    const doLoad = async () => {
      try {
        if (userId && projectId) {
          const res = await fetch(
            `/api/shares?projectId=${encodeURIComponent(projectId)}`,
            { signal: ac.signal }
          );
          if (ac.signal.aborted) return;

          const data = (await res.json()) as {
            ok: boolean;
            share?: {
              token: string;
              expiresAt: string | null;
              shareType: "temporary" | "published";
              galleryState: string | null;
              galleryTitle: string | null;
              galleryDescription: string | null;
            } | null;
          };

          if (ac.signal.aborted) return;

          if (data.ok && data.share) {
            const s = data.share;
            const expiry = inferExpiryDays(s.expiresAt);
            setShare({
              url: new URL(
                buildStoredSharePath(s.token, currentView),
                window.location.origin
              ).toString(),
              shareToken: s.token,
              shareType: s.shareType,
              expiresInDays: expiry,
              galleryState: parseGalleryState(s.galleryState),
              galleryTitle: s.galleryTitle ?? "",
              galleryDescription: s.galleryDescription ?? "",
            });
            if (expiry !== null) {
              setExpiresInDays(expiry);
            }
          }
        } else {
          const stored = readAnonShare();
          if (stored && stored.designToken === currentDesignToken) {
            setShare({
              url: stored.url,
              shareToken: stored.shareToken,
              shareType: "temporary",
              expiresInDays: stored.expiresInDays,
              galleryState: "unlisted",
              galleryTitle: "",
              galleryDescription: "",
            });
            setPublishedDesignToken(stored.designToken);
            if (stored.expiresInDays) setExpiresInDays(stored.expiresInDays);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      } finally {
        if (!ac.signal.aborted) setLoadDone(true);
      }
    };

    void doLoad();
    return () => {
      ac.abort();
      if (abortRef.current === ac) abortRef.current = null;
    };
  }, [
    open,
    existingShareMode,
    userId,
    projectId,
    currentView,
    currentDesignToken,
  ]);

  useEffect(() => {
    if (!showGalleryForm) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGalleryTitleInput(share?.galleryTitle || design.title.trim());
    setGalleryDescriptionInput(
      share?.galleryDescription || design.description?.trim() || ""
    );
    setGalleryPreviewDataUrl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGalleryForm]);

  const doPublish = async (force = false): Promise<string> => {
    setPublishing(true);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design,
          view: currentView,
          ...(!isAuthenticated ? { expiresInDays } : {}),
          ...(projectId ? { projectId } : {}),
        }),
      });
      const data = (await res.json()) as
        | {
            ok: true;
            share: {
              token: string;
              path: string;
              expiresAt: string | null;
              shareType: "temporary" | "published";
            };
          }
        | { ok: false; error?: string };

      if (!data.ok)
        throw new Error(data.error ?? "Failed to create share link");

      const url = new URL(data.share.path, window.location.origin).toString();
      const expiry =
        data.share.shareType === "published"
          ? null
          : (inferExpiryDays(data.share.expiresAt) ?? expiresInDays);

      if (force && share && share.shareToken !== data.share.token) {
        fetch(`/api/shares/${encodeURIComponent(share.shareToken)}`, {
          method: "DELETE",
        }).catch(() => {
          /* ignore */
        });
      }

      const newShare: ActiveShare = {
        url,
        shareToken: data.share.token,
        shareType: data.share.shareType,
        expiresInDays: expiry,
        galleryState: "unlisted",
        galleryTitle: design.title.trim(),
        galleryDescription: design.description?.trim() ?? "",
      };
      setShare(newShare);
      setPublishedDesignToken(currentDesignToken);

      if (!userId || !projectId) {
        writeAnonShare({
          url,
          shareToken: data.share.token,
          designToken: currentDesignToken,
          expiresInDays: expiry,
        });
      }

      onSharePublished?.();
      return url;
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = async (force = false) => {
    try {
      await doPublish(force);
      toast.success(
        force ? t("share.success.linkUpdated") : t("share.success.linkCreated")
      );
    } catch {
      toast.error(t("share.errors.createFailed"), {
        description: t("share.errors.createFailedDescription"),
      });
    }
  };

  const handleCopy = async () => {
    try {
      const url =
        share && !linkNeedsRefresh
          ? share.url
          : await doPublish(linkNeedsRefresh);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("share.success.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("share.errors.copyFailed"), {
        description: t("share.errors.copyFailedDescription"),
      });
    }
  };

  const handleNativeShare = async () => {
    try {
      const url =
        share && !linkNeedsRefresh
          ? share.url
          : await doPublish(linkNeedsRefresh);
      await navigator.share({
        title: design.title || "TrackDraw",
        text: `Check out this FPV track: ${design.title || "Untitled"}`,
        url,
      });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error(t("share.errors.nativeShareFailed"), {
          description: t("share.errors.nativeShareFailedDescription"),
        });
      }
    }
  };

  const handleOpenInTab = async () => {
    try {
      const url =
        share && !linkNeedsRefresh
          ? share.url
          : await doPublish(linkNeedsRefresh);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("share.errors.createFailed"), {
        description: t("share.errors.createFailedDescription"),
      });
    }
  };

  const handleRevoke = async () => {
    if (!share) return;
    setRevoking(true);
    try {
      const res = await fetch(
        `/api/shares/${encodeURIComponent(share.shareToken)}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Failed to revoke link");

      setShare(null);
      setPublishedDesignToken(null);
      clearAnonShare();
      toast.success(t("share.success.linkRevoked"));
    } catch {
      toast.error(t("share.errors.revokeFailed"), {
        description: t("share.errors.revokeFailedDescription"),
      });
    } finally {
      setRevoking(false);
    }
  };

  const handleCopyEmbed = async () => {
    if (!iframeCode) return;
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopiedEmbed(true);
      toast.success(t("share.success.embedCopied"));
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      toast.error(t("share.errors.embedCopyFailed"), {
        description: t("share.errors.embedCopyFailedDescription"),
      });
    }
  };

  const handleListInGallery = async () => {
    if (!share || !galleryPreviewDataUrl) return;
    try {
      const webpDataUrl = await convertPngToWebp(galleryPreviewDataUrl);

      setGalleryUpdating(true);
      const res = await fetch(
        `/api/shares/${encodeURIComponent(share.shareToken)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "list",
            title: galleryTitleInput.trim(),
            description: galleryDescriptionInput.trim(),
            previewDataUrl: webpDataUrl,
          }),
        }
      );
      const data = (await res.json()) as
        | {
            ok: true;
            share: {
              expiresAt: string | null;
              galleryState: string | null;
              galleryTitle: string | null;
              galleryDescription: string | null;
            };
          }
        | { ok: false; error?: string };

      if (!data.ok) throw new Error(data.error ?? "Failed to list in gallery");

      setShare({
        ...share,
        expiresInDays: inferExpiryDays(data.share.expiresAt),
        galleryState: parseGalleryState(data.share.galleryState),
        galleryTitle: data.share.galleryTitle ?? galleryTitleInput.trim(),
        galleryDescription:
          data.share.galleryDescription ?? galleryDescriptionInput.trim(),
      });
      setShowGalleryForm(false);
      toast.success(t("share.success.galleryListed"));
    } catch {
      toast.error(t("share.errors.galleryListFailed"), {
        description: t("share.errors.galleryListFailedDescription"),
      });
    } finally {
      setGalleryUpdating(false);
    }
  };

  const handleUnlistFromGallery = async () => {
    if (!share) return;
    setGalleryUpdating(true);
    try {
      const res = await fetch(
        `/api/shares/${encodeURIComponent(share.shareToken)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unlist" }),
        }
      );
      const data = (await res.json()) as
        | {
            ok: true;
            share: { expiresAt: string | null; galleryState: string | null };
          }
        | { ok: false; error?: string };

      if (!data.ok)
        throw new Error(data.error ?? "Failed to remove from gallery");

      setShare({
        ...share,
        expiresInDays:
          inferExpiryDays(data.share.expiresAt) ?? share.expiresInDays,
        galleryState: parseGalleryState(data.share.galleryState),
      });
      setConfirmRemoveFromGallery(false);
      toast.success("Track removed from gallery");
    } catch {
      toast.error(t("share.errors.galleryRemoveFailed"), {
        description: t("share.errors.galleryRemoveFailedDescription"),
      });
    } finally {
      setGalleryUpdating(false);
    }
  };

  const handleUpdateGalleryMetadata = async () => {
    if (!share) return;
    setGalleryUpdating(true);
    try {
      const res = await fetch(
        `/api/shares/${encodeURIComponent(share.shareToken)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            title: galleryTitleInput.trim(),
            description: galleryDescriptionInput.trim(),
          }),
        }
      );
      const data = (await res.json()) as
        | {
            ok: true;
            share: {
              expiresAt: string | null;
              galleryState: string | null;
              galleryTitle: string | null;
              galleryDescription: string | null;
            };
          }
        | { ok: false; error?: string };

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to update gallery details");
      }

      setShare({
        ...share,
        expiresInDays:
          inferExpiryDays(data.share.expiresAt) ?? share.expiresInDays,
        galleryState: parseGalleryState(data.share.galleryState),
        galleryTitle: data.share.galleryTitle ?? galleryTitleInput.trim(),
        galleryDescription:
          data.share.galleryDescription ?? galleryDescriptionInput.trim(),
      });
      setShowGalleryForm(false);
      toast.success(t("share.success.galleryUpdated"));
    } catch {
      toast.error(t("share.errors.galleryUpdateFailed"), {
        description: t("share.errors.galleryUpdateFailedDescription"),
      });
    } finally {
      setGalleryUpdating(false);
    }
  };

  const handleCopyCurrentUrl = async () => {
    if (!currentShareUrl) {
      toast.error(t("share.errors.unableToReadLink"), {
        description: t("share.errors.unableToReadLinkDescription"),
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(currentShareUrl);
      setCopied(true);
      toast.success(t("share.success.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("share.errors.copyFailed"), {
        description: t("share.errors.copyFailedDescription"),
      });
    }
  };

  const handleNativeShareCurrentUrl = async () => {
    if (!currentShareUrl) return;
    try {
      await navigator.share({
        title: design.title || "TrackDraw",
        text: `Check out this FPV track: ${design.title || "Untitled"}`,
        url: currentShareUrl,
      });
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error(t("share.errors.nativeShareFailed"), {
          description: t("share.errors.nativeShareFailedDescription"),
        });
      }
    }
  };

  const primaryActionLabel = share
    ? linkNeedsRefresh
      ? t("share.actions.primary.updateLink")
      : t("share.actions.primary.copyLink")
    : isAccountProjectShare
      ? t("share.actions.primary.createLink")
      : isAuthenticated
        ? t("share.actions.primary.createNewLink")
        : t("share.actions.primary.createLink");
  const PrimaryIcon = share
    ? linkNeedsRefresh
      ? Link2
      : copied
        ? Check
        : Copy
    : Link2;
  const primaryAction = share
    ? linkNeedsRefresh
      ? () => handlePublish(true)
      : handleCopy
    : () => handlePublish();

  const galleryStateLabel = !loadDone
    ? t("share.gallery.status.loading")
    : share?.galleryState === "featured"
      ? t("share.gallery.status.featured")
      : share?.galleryState === "listed"
        ? t("share.gallery.status.listed")
        : share?.galleryState === "hidden"
          ? t("share.gallery.status.hiddenByModeration")
          : share
            ? t("share.gallery.status.linkOnly")
            : t("share.gallery.status.noPublishedLink");

  const galleryStateDesc = !loadDone
    ? t("share.gallery.descriptions.checking")
    : share?.galleryState === "featured"
      ? t("share.gallery.descriptions.featured")
      : share?.galleryState === "listed"
        ? t("share.gallery.descriptions.listed")
        : share?.galleryState === "hidden"
          ? t("share.gallery.descriptions.hidden")
          : share
            ? t("share.gallery.descriptions.linkOnly")
            : t("share.gallery.descriptions.noLink");

  const galleryVisibilityValue = !loadDone
    ? t("share.gallery.status.checking")
    : share?.galleryState === "featured"
      ? t("share.gallery.status.featured")
      : share?.galleryState === "listed"
        ? t("share.gallery.status.listed")
        : share?.galleryState === "hidden"
          ? t("share.gallery.status.hiddenByModeration")
          : share
            ? t("share.gallery.status.linkOnly")
            : t("share.gallery.status.noLink");
  const galleryShareLinkValue = !share
    ? t("share.gallery.status.noLink")
    : share.shareType === "published"
      ? tCommon("status.published")
      : share.expiresInDays === null
        ? t("share.gallery.status.noExpiry")
        : t("share.gallery.status.expiresInDays", {
            days: share.expiresInDays,
          });
  const GalleryStatusIcon = !loadDone
    ? Loader2
    : share?.galleryState === "featured"
      ? Sparkles
      : share?.galleryState === "listed"
        ? ImageIcon
        : share?.galleryState === "hidden"
          ? EyeOff
          : Link2;
  const galleryStatusTone = !loadDone
    ? "bg-muted text-muted-foreground"
    : share?.galleryState === "featured"
      ? "bg-amber-500/10 text-amber-500"
      : share?.galleryState === "listed"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : share?.galleryState === "hidden"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";

  const navItems: SidebarDialogNavItem[] = existingShareMode
    ? [
        {
          id: "share",
          label: t("share.nav.shareLink"),
          icon: <Link2 className="size-4" />,
        },
        {
          id: "actions",
          label: tCommon("labels.actions"),
          icon: <ExternalLink className="size-4" />,
        },
      ]
    : [
        {
          id: "share",
          label: t("share.nav.share"),
          icon: <Link2 className="size-4" />,
        },
        ...(showEmbedSection
          ? [
              {
                id: "embed",
                label: t("share.nav.embed"),
                icon: <Code2 className="size-4" />,
              },
            ]
          : []),
        ...(isAccountProjectShare
          ? [
              {
                id: "gallery",
                label: t("share.nav.gallery"),
                icon: <ImageIcon className="size-4" />,
              },
            ]
          : []),
        {
          id: "actions",
          label: tCommon("labels.actions"),
          icon: <ExternalLink className="size-4" />,
        },
      ];

  const validTabs = navItems.map((i) => i.id);
  const resolvedTab: Tab = (
    validTabs.includes(activeTab) ? activeTab : "share"
  ) as Tab;

  const contentMeta: Record<Tab, { title: string; description: string }> = {
    share: {
      title: t("share.content.share.title"),
      description: existingShareMode
        ? t("share.content.share.description.existing")
        : isAuthenticated
          ? isAccountProjectShare
            ? t("share.content.share.description.account")
            : t("share.content.share.description.separate")
          : t("share.content.share.description.anonymous"),
    },
    gallery: {
      title: t("share.content.gallery.title"),
      description: t("share.content.gallery.description"),
    },
    embed: {
      title: t("share.content.embed.title"),
      description: t("share.content.embed.description"),
    },
    actions: {
      title: tCommon("labels.actions"),
      description: existingShareMode
        ? t("share.content.actions.descriptionExisting")
        : t("share.content.actions.description"),
    },
  };

  return (
    <>
      {isAccountProjectShare && showGalleryForm && !isGalleryVisible && (
        <GalleryPreviewRenderer onCapture={setGalleryPreviewDataUrl} />
      )}

      <SidebarDialog
        open={open}
        onOpenChange={onOpenChange}
        eyebrow={
          existingShareMode
            ? t("share.dialog.existingEyebrow")
            : t("share.dialog.eyebrow")
        }
        title={t("share.dialog.title")}
        mobileSubtitle={t("share.dialog.mobileSubtitle")}
        navItems={navItems}
        activeItem={resolvedTab}
        onItemChange={(id) => setActiveTab(id as Tab)}
        contentTitle={contentMeta[resolvedTab].title}
        contentDescription={contentMeta[resolvedTab].description}
      >
        {resolvedTab === "share" && (
          <div className="space-y-4">
            {existingShareMode ? (
              <div className="border-border/60 bg-muted/18 space-y-3 rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <div className="bg-background/70 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/5">
                    <Link2 className="text-muted-foreground size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium">
                      {t("share.currentLink.title")}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {t("share.currentLink.readOnlyReviewOn", {
                        view: currentView.toUpperCase(),
                        hostname,
                      })}
                    </p>
                  </div>
                </div>
                {currentShareUrl ? (
                  <input
                    readOnly
                    value={currentShareUrl}
                    onFocus={(e) => e.target.select()}
                    className="border-border bg-background/70 text-foreground focus:ring-ring/40 w-full min-w-0 truncate rounded-lg border px-3 py-2 font-mono text-xs outline-hidden focus:ring-1"
                  />
                ) : null}
                <Button
                  onClick={handleCopyCurrentUrl}
                  className={cn(shareDialogButtonClassName, "w-full")}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {t("share.actions.copyLink")}
                </Button>
              </div>
            ) : (
              <>
                {showExpirySelector ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-foreground text-sm font-medium">
                        {t("share.link.expiry.label")}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        {t("share.link.expiry.description")}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {SHARE_EXPIRY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setExpiresInDays(option.value)}
                          className={cn(
                            "border-border/60 bg-background/65 text-foreground hover:bg-muted/40 cursor-pointer rounded-lg border px-3 py-2 text-xs transition-colors",
                            expiresInDays === option.value &&
                              "border-foreground/15 bg-muted text-foreground"
                          )}
                        >
                          {t("share.link.expiry.days", { days: option.value })}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-border/60 bg-muted/18 rounded-xl border px-3 py-3">
                    <p className="text-foreground text-sm font-medium">
                      {isAccountProjectShare
                        ? t("share.link.titles.savedProject")
                        : t("share.link.titles.newShare")}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                      {isAccountProjectShare
                        ? t("share.link.descriptions.savedProject")
                        : t("share.link.descriptions.newShare")}
                    </p>
                  </div>
                )}

                <div className="border-border/60 space-y-3 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-background/70 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/5">
                      <Link2 className="text-muted-foreground size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-medium">
                        {share
                          ? share.shareType === "published"
                            ? isAccountProjectShare
                              ? t("share.link.titles.savedProject")
                              : t("share.link.titles.separatePublished")
                            : t("share.link.titles.temporary")
                          : isAuthenticated
                            ? isAccountProjectShare
                              ? t("share.link.titles.noSavedProject")
                              : t("share.link.titles.noSeparate")
                            : t("share.link.titles.noTemporary")}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {share
                          ? share.expiresInDays === null
                            ? t("share.link.lifetime.published", { hostname })
                            : t("share.link.lifetime.temporary", {
                                hostname,
                                days: share.expiresInDays,
                              })
                          : isAuthenticated
                            ? isAccountProjectShare
                              ? t("share.link.descriptions.createSavedProject")
                              : t("share.link.descriptions.createSeparate")
                            : t("share.link.descriptions.createTemporary")}
                      </p>
                    </div>
                  </div>
                  {share ? (
                    <input
                      id="share-url-input"
                      readOnly
                      value={share.url}
                      onFocus={(e) => e.target.select()}
                      className="border-border bg-background/70 text-foreground focus:ring-ring/40 w-full min-w-0 truncate rounded-lg border px-3 py-2 font-mono text-xs outline-hidden focus:ring-1"
                    />
                  ) : null}
                  {linkNeedsRefresh ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-400">
                      <Share2 className="mt-0.5 size-3.5 shrink-0" />
                      <span className="leading-relaxed">
                        {shareNeedsRefresh
                          ? t("share.link.warnings.outdatedDesign")
                          : t("share.link.warnings.outdatedExpiry")}
                      </span>
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "grid grid-cols-1 gap-2",
                      share &&
                        isAuthenticated &&
                        (linkNeedsRefresh
                          ? "min-[520px]:grid-cols-2"
                          : "min-[520px]:grid-cols-3")
                    )}
                  >
                    <Button
                      onClick={primaryAction}
                      disabled={busy}
                      className={cn(shareDialogButtonClassName, "w-full")}
                    >
                      <PrimaryIcon className="size-4" />
                      {primaryActionLabel}
                    </Button>
                    {share && isAuthenticated ? (
                      <>
                        {!linkNeedsRefresh ? (
                          <Button
                            variant="outline"
                            onClick={() => handlePublish(true)}
                            disabled={busy}
                            className={cn(shareDialogButtonClassName, "w-full")}
                          >
                            <RefreshCw className="size-4" />
                            {t("share.actions.primary.updateLink")}
                          </Button>
                        ) : null}
                        <Button
                          variant="destructive"
                          onClick={handleRevoke}
                          disabled={busy}
                          className={cn(shareDialogButtonClassName, "w-full")}
                        >
                          <Ban className="size-4" />
                          {t("share.actions.revoke")}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {resolvedTab === "embed" && (
          <div className="space-y-4">
            {!loadDone ? (
              <div className="flex items-center gap-2">
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  {t("share.embed.state.loading")}
                </p>
              </div>
            ) : !share ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Code2 className="text-muted-foreground size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium">
                      {t("share.embed.publish.title")}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                      {t("share.embed.publish.description")}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handlePublish()}
                  disabled={busy}
                  className={cn(shareDialogButtonClassName, "w-full")}
                >
                  {publishing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Link2 className="size-4" />
                  )}
                  {t("share.embed.publish.action")}
                </Button>
              </div>
            ) : share.shareType !== "published" ? (
              <div className="space-y-2">
                <p className="text-foreground text-sm font-medium">
                  {t("share.embed.temporary.title")}
                </p>
                <p className="text-muted-foreground text-[12px] leading-relaxed">
                  {t("share.embed.temporary.description")}
                </p>
              </div>
            ) : linkNeedsRefresh ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-400">
                  <Share2 className="mt-0.5 size-3.5 shrink-0" />
                  <span className="leading-relaxed">
                    {t("share.embed.refresh.message")}
                  </span>
                </div>
                <Button
                  onClick={() => handlePublish(true)}
                  disabled={busy}
                  className={cn(shareDialogButtonClassName, "w-full")}
                >
                  {publishing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  {t("share.embed.refresh.action")}
                </Button>
              </div>
            ) : iframeCode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Code2 className="text-muted-foreground size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium">
                      {t("share.embed.code.title")}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {t("share.embed.code.description")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground text-[11px] font-medium">
                    {t("share.embed.initialView.label")}
                  </p>
                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                    {(
                      [
                        {
                          view: "2d",
                          label: t(
                            "share.embed.initialView.options.layout2d.label"
                          ),
                          description: t(
                            "share.embed.initialView.options.layout2d.description"
                          ),
                          icon: Route,
                        },
                        {
                          view: "3d",
                          label: t(
                            "share.embed.initialView.options.preview3d.label"
                          ),
                          description: t(
                            "share.embed.initialView.options.preview3d.description"
                          ),
                          icon: Orbit,
                        },
                      ] as const
                    ).map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.view}
                          type="button"
                          onClick={() => {
                            setEmbedView(option.view);
                            setCopiedEmbed(false);
                          }}
                          className={cn(
                            "border-border/60 bg-background/65 flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                            embedView === option.view
                              ? "border-foreground/15 bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          <Icon className="mt-0.5 size-3.5 shrink-0" />
                          <span className="min-w-0">
                            <span className="block text-xs font-medium">
                              {option.label}
                            </span>
                            <span
                              className={cn(
                                "mt-0.5 block text-[10px] leading-snug",
                                embedView === option.view
                                  ? "text-foreground/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              {option.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col gap-2 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
                    <div>
                      <p className="text-muted-foreground text-[11px] font-medium">
                        {t("share.embed.code.label")}
                      </p>
                      <p className="text-muted-foreground/75 mt-0.5 text-[10px]">
                        {t("share.embed.code.selectedViewDescription")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyEmbed}
                      className={cn(
                        shareDialogSmallButtonClassName,
                        "w-full min-[520px]:w-auto"
                      )}
                    >
                      {copiedEmbed ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      {t("share.embed.code.copy")}
                    </Button>
                  </div>
                  <textarea
                    readOnly
                    value={iframeCode}
                    rows={3}
                    onFocus={(e) => e.target.select()}
                    className="border-border bg-background/70 text-foreground focus:ring-ring/40 w-full min-w-0 resize-none rounded-lg border px-3 py-2 font-mono text-xs outline-hidden focus:ring-1"
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}

        {resolvedTab === "gallery" && (
          <div className="space-y-4">
            <div className="border-border/60 bg-muted/18 space-y-3 rounded-xl border p-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    galleryStatusTone
                  )}
                >
                  <GalleryStatusIcon
                    className={cn("size-4", !loadDone && "animate-spin")}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">
                    {galleryStateLabel}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                    {galleryStateDesc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                <div className="bg-background/55 rounded-lg px-3 py-2">
                  <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
                    {t("share.gallery.labels.visibility")}
                  </p>
                  <p className="text-foreground mt-0.5 text-xs font-medium">
                    {galleryVisibilityValue}
                  </p>
                </div>
                <div className="bg-background/55 rounded-lg px-3 py-2">
                  <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
                    {t("share.gallery.labels.shareLink")}
                  </p>
                  <p className="text-foreground mt-0.5 text-xs font-medium">
                    {galleryShareLinkValue}
                  </p>
                </div>
              </div>
            </div>

            {!loadDone ? null : !share ? (
              <div className="border-border/60 bg-muted/12 space-y-3 rounded-xl border p-3">
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {t("share.gallery.publishFirst.title")}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                    {t("share.gallery.publishFirst.description")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("share")}
                  className={cn(shareDialogButtonClassName, "w-full")}
                >
                  {t("share.gallery.publishFirst.action")}
                </Button>
              </div>
            ) : blockedByModeration ? (
              <div className="border-destructive/25 bg-destructive/8 space-y-1.5 rounded-xl border p-3">
                <p className="text-destructive text-sm font-medium">
                  {t("share.gallery.moderation.title")}
                </p>
                <p className="text-destructive text-[11px] leading-relaxed">
                  {t("share.gallery.moderation.description")}
                </p>
              </div>
            ) : showGalleryForm ? (
              <div className="space-y-3">
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {isGalleryVisible
                      ? t("share.gallery.details.title")
                      : t("share.gallery.list.title")}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                    {isGalleryVisible
                      ? t("share.gallery.details.description")
                      : t("share.gallery.list.description")}
                  </p>
                </div>

                <label className="block">
                  <span className="text-muted-foreground mb-1.5 block text-[11px] font-medium">
                    {tCommon("labels.title")}
                  </span>
                  <input
                    value={galleryTitleInput}
                    onChange={(e) => setGalleryTitleInput(e.target.value)}
                    className="border-border bg-background/70 text-foreground focus:ring-ring/40 w-full min-w-0 rounded-lg border px-3 py-2 text-sm outline-hidden focus:ring-1"
                    placeholder={t("share.gallery.fields.titlePlaceholder")}
                  />
                </label>

                <label className="block">
                  <span className="text-muted-foreground mb-1.5 block text-[11px] font-medium">
                    {tCommon("labels.description")}
                  </span>
                  <textarea
                    value={galleryDescriptionInput}
                    onChange={(e) => setGalleryDescriptionInput(e.target.value)}
                    maxLength={GALLERY_DESCRIPTION_MAX_LENGTH}
                    rows={3}
                    className="border-border bg-background/70 text-foreground focus:ring-ring/40 w-full min-w-0 resize-none rounded-lg border px-3 py-2 text-sm outline-hidden focus:ring-1"
                    placeholder={t(
                      "share.gallery.fields.descriptionPlaceholder"
                    )}
                  />
                  <span className="text-muted-foreground mt-1 block text-right text-[10px]">
                    {galleryDescriptionInput.length}/
                    {GALLERY_DESCRIPTION_MAX_LENGTH}
                  </span>
                </label>

                {!isGalleryVisible ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-[11px]">
                      {t("share.gallery.labels.author")}:{" "}
                      <span
                        className={displayNameValid ? "" : "text-destructive"}
                      >
                        {displayNameValid
                          ? displayName
                          : t("share.gallery.fallback.noDisplayName")}
                      </span>
                    </p>

                    <div className="flex items-center gap-2">
                      {galleryPreviewDataUrl === null ? (
                        <>
                          <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
                          <span className="text-muted-foreground text-[11px]">
                            {t("share.gallery.preview.generating")}
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="size-3.5 text-emerald-500" />
                          <span className="text-muted-foreground text-[11px]">
                            {t("share.gallery.preview.ready")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {!isGalleryVisible && shareNeedsRefresh ? (
                  <p className="text-muted-foreground text-[11px]">
                    {t("share.gallery.validation.refreshShareFirst")}
                  </p>
                ) : !galleryTitleValid ? (
                  <p className="text-destructive text-[11px]">
                    {t("share.gallery.validation.titleRequired")}
                  </p>
                ) : !galleryDescriptionValid ? (
                  <p className="text-destructive text-[11px]">
                    {t("share.gallery.validation.descriptionLength", {
                      min: GALLERY_DESCRIPTION_MIN_LENGTH,
                      max: GALLERY_DESCRIPTION_MAX_LENGTH,
                    })}
                  </p>
                ) : !isGalleryVisible && !displayNameValid ? (
                  <p className="text-destructive text-[11px]">
                    {t("share.gallery.validation.displayNameRequired")}
                  </p>
                ) : isGalleryVisible && !hasGalleryMetadataChanges ? (
                  <p className="text-muted-foreground text-[11px]">
                    {t("share.gallery.validation.noMetadataChanges")}
                  </p>
                ) : null}

                <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowGalleryForm(false)}
                    disabled={busy}
                    className={shareDialogButtonClassName}
                  >
                    {tCommon("actions.cancel")}
                  </Button>
                  <Button
                    onClick={
                      isGalleryVisible
                        ? handleUpdateGalleryMetadata
                        : handleListInGallery
                    }
                    disabled={
                      busy ||
                      (isGalleryVisible
                        ? !canSubmitGalleryMetadataUpdate
                        : !canSubmitGalleryListing)
                    }
                    className={shareDialogButtonClassName}
                  >
                    {isGalleryVisible
                      ? tCommon("actions.saveChanges")
                      : t("share.gallery.list.add")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {isGalleryVisible ? (
                    <>
                      <div>
                        <p className="text-foreground text-sm font-medium">
                          {t("share.gallery.card.title")}
                        </p>
                        <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                          {t("share.gallery.card.description")}
                        </p>
                      </div>
                      <dl className="space-y-2 text-[12px]">
                        <div className="space-y-0.5 min-[420px]:grid min-[420px]:grid-cols-[4.5rem_1fr] min-[420px]:gap-3 min-[420px]:space-y-0">
                          <dt className="text-muted-foreground">
                            {tCommon("labels.title")}
                          </dt>
                          <dd className="text-foreground truncate font-medium">
                            {share.galleryTitle ||
                              design.title ||
                              t("share.gallery.card.untitled")}
                          </dd>
                        </div>
                        <div className="space-y-0.5 min-[420px]:grid min-[420px]:grid-cols-[4.5rem_1fr] min-[420px]:gap-3 min-[420px]:space-y-0">
                          <dt className="text-muted-foreground">
                            {tCommon("labels.description")}
                          </dt>
                          <dd className="text-muted-foreground line-clamp-2 leading-relaxed">
                            {share.galleryDescription ||
                              t("share.gallery.card.noDescription")}
                          </dd>
                        </div>
                      </dl>
                      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                        <Button
                          onClick={() => {
                            setConfirmRemoveFromGallery(false);
                            setShowGalleryForm(true);
                          }}
                          disabled={busy}
                          className={shareDialogButtonClassName}
                        >
                          {t("share.gallery.details.edit")}
                        </Button>
                        <Button
                          variant="outline"
                          className={shareDialogButtonClassName}
                          asChild
                        >
                          <Link href="/gallery">
                            {t("share.gallery.card.viewGallery")}
                          </Link>
                        </Button>
                      </div>
                      {confirmRemoveFromGallery ? (
                        <div className="border-border/60 flex flex-col gap-2 border-t pt-3">
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {t("share.gallery.remove.confirm")}
                          </p>
                          <div className="flex flex-col-reverse gap-2 min-[380px]:flex-row min-[380px]:justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                shareDialogSmallButtonClassName,
                                "w-full min-[380px]:w-auto"
                              )}
                              onClick={() => setConfirmRemoveFromGallery(false)}
                              disabled={busy}
                            >
                              {tCommon("actions.cancel")}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className={cn(
                                shareDialogSmallButtonClassName,
                                "w-full min-[380px]:w-auto"
                              )}
                              onClick={handleUnlistFromGallery}
                              disabled={busy}
                            >
                              <Trash2 className="size-4" />
                              {tCommon("actions.remove")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-border/60 flex justify-end border-t pt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmRemoveFromGallery(true)}
                            disabled={busy}
                            className={cn(
                              shareDialogSmallButtonClassName,
                              "text-destructive hover:text-destructive"
                            )}
                          >
                            <Trash2 className="size-4" />
                            {t("share.gallery.remove.action")}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-foreground text-sm font-medium">
                          {t("share.gallery.list.readyTitle")}
                        </p>
                        <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                          {t("share.gallery.list.readyDescription")}
                        </p>
                      </div>
                      {shareNeedsRefresh ? (
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {t("share.gallery.validation.refreshShareFirst")}
                        </p>
                      ) : null}
                      <div className="border-border/60 flex border-t pt-3 min-[520px]:justify-end">
                        <Button
                          onClick={() => {
                            setConfirmRemoveFromGallery(false);
                            setShowGalleryForm(true);
                          }}
                          disabled={busy || shareNeedsRefresh}
                          className={cn(
                            shareDialogButtonClassName,
                            "w-full min-[520px]:w-auto"
                          )}
                        >
                          {t("share.gallery.list.add")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {resolvedTab === "actions" && (
          <div className="space-y-4">
            <div className="border-border/50 bg-muted/12 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[11px]">
              <Share2 className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <p className="text-muted-foreground leading-relaxed">
                {existingShareMode
                  ? t("share.actions.share.existingDescription")
                  : hasPath
                    ? t("share.actions.share.withPathDescription", {
                        view: currentView.toUpperCase(),
                      })
                    : t("share.actions.share.withoutPathDescription")}
              </p>
            </div>

            <div className="border-border/50 overflow-hidden rounded-xl border">
              {canNativeShare &&
              (existingShareMode ? !!currentShareUrl : !!share) ? (
                <button
                  onClick={
                    existingShareMode
                      ? handleNativeShareCurrentUrl
                      : handleNativeShare
                  }
                  className="border-border/40 hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 border-b px-4 py-3 text-left transition-colors"
                >
                  <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Share2 className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium">
                      {t("share.actions.nativeShare.title")}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {t("share.actions.nativeShare.description")}
                    </p>
                  </div>
                </button>
              ) : null}

              {(existingShareMode ? !!currentShareUrl : !!share) ? (
                <button
                  onClick={
                    existingShareMode
                      ? () =>
                          currentShareUrl &&
                          window.open(
                            currentShareUrl,
                            "_blank",
                            "noopener,noreferrer"
                          )
                      : handleOpenInTab
                  }
                  className={cn(
                    "hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors",
                    !existingShareMode && onExportJson
                      ? "border-border/40 border-b"
                      : ""
                  )}
                >
                  <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <ExternalLink className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium">
                      {t("share.actions.openInTab.label")}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {existingShareMode
                        ? t("share.actions.openInTab.reopenCurrent")
                        : t("share.actions.openInTab.previewLink")}
                    </p>
                  </div>
                </button>
              ) : null}

              {!existingShareMode && onExportJson ? (
                <button
                  onClick={onExportJson}
                  className="hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
                >
                  <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Boxes className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium">
                      {t("share.actions.exportJson.label")}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {t("share.actions.exportJson.description")}
                    </p>
                  </div>
                </button>
              ) : null}
            </div>
          </div>
        )}
      </SidebarDialog>
    </>
  );
}
