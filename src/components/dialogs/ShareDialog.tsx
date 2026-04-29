"use client";

import { useEffect, useRef, useState } from "react";
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
import { parseEditorView } from "@/lib/view";
import { authClient } from "@/lib/auth-client";
import {
  GALLERY_DESCRIPTION_MAX_LENGTH,
  GALLERY_DESCRIPTION_MIN_LENGTH,
  canSubmitGalleryListing as canSubmitGalleryListingForm,
  canSubmitGalleryMetadataUpdate as canSubmitGalleryMetadataUpdateForm,
  isGalleryDescriptionValid,
  isGalleryTitleValid,
} from "@/lib/gallery-validation";
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
  { value: 7 as const, label: "7 days" },
  { value: 30 as const, label: "30 days" },
  { value: 90 as const, label: "90 days" },
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
        ? localStorage.getItem(LS_ANON_SHARE_KEY)
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
    localStorage.setItem(LS_ANON_SHARE_KEY, JSON.stringify(share));
  } catch {
    /* quota */
  }
}

function clearAnonShare() {
  try {
    localStorage.removeItem(LS_ANON_SHARE_KEY);
  } catch {
    /* ignore */
  }
}

function getLifetimeCopy(hostname: string, expiresInDays: 7 | 30 | 90 | null) {
  return expiresInDays === null
    ? `Published link on ${hostname}, stays live until revoked`
    : `Read-only snapshot on ${hostname}, expires in ${expiresInDays} days`;
}

function buildIframeCode(embedUrl: string) {
  return `<iframe src="${embedUrl}" title="TrackDraw track embed" loading="lazy" style="width:100%;height:600px;border:0;" allowfullscreen></iframe>`;
}

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
  const iframeCode = embedUrl ? buildIframeCode(embedUrl) : null;

  const isGalleryVisible =
    share?.galleryState === "listed" || share?.galleryState === "featured";
  const blockedByModeration = share?.galleryState === "hidden";
  const showEmbedSection = isAuthenticated && !existingShareMode;
  const showGallerySection = isAuthenticated && !!projectId;

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
      toast.success(force ? "Link updated" : "Link created");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create share link"
      );
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
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to copy link");
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
        toast.error(err.message);
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
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create share link"
      );
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
      toast.success("Link revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke link");
    } finally {
      setRevoking(false);
    }
  };

  const handleCopyEmbed = async () => {
    if (!iframeCode) return;
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopiedEmbed(true);
      toast.success("Embed code copied");
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      toast.error("Failed to copy embed code");
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
      toast.success("Track listed in gallery");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to list in gallery"
      );
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
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove from gallery"
      );
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
      toast.success("Gallery details updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update gallery details"
      );
    } finally {
      setGalleryUpdating(false);
    }
  };

  const handleCopyCurrentUrl = async () => {
    if (!currentShareUrl) {
      toast.error("Unable to read the current share link");
      return;
    }
    try {
      await navigator.clipboard.writeText(currentShareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
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
        toast.error(err.message);
      }
    }
  };

  const primaryActionLabel = share
    ? linkNeedsRefresh
      ? "Update link"
      : "Copy link"
    : "Create link";
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
    ? "Loading current state"
    : share?.galleryState === "featured"
      ? "Featured in gallery"
      : share?.galleryState === "listed"
        ? "Listed in gallery"
        : share?.galleryState === "hidden"
          ? "Hidden by moderation"
          : share
            ? "Link only"
            : "No published link";

  const galleryStateDesc = !loadDone
    ? "Checking the current gallery status."
    : share?.galleryState === "featured"
      ? "Visible in the public gallery and pinned near the top."
      : share?.galleryState === "listed"
        ? "Visible in the public gallery."
        : share?.galleryState === "hidden"
          ? "Hidden by moderation. The direct link still works until it is revoked."
          : share
            ? "Direct link only. Not visible in the public gallery."
            : "Create a share link first.";

  const galleryVisibilityValue = !loadDone
    ? "Checking"
    : share?.galleryState === "featured"
      ? "Featured"
      : share?.galleryState === "listed"
        ? "Listed"
        : share?.galleryState === "hidden"
          ? "Hidden"
          : share
            ? "Link only"
            : "No link";
  const galleryShareLinkValue = !share
    ? "No link"
    : share.shareType === "published"
      ? "Published"
      : share.expiresInDays === null
        ? "No expiry"
        : `Expires in ${share.expiresInDays} days`;
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
        ? "bg-primary/10 text-primary"
        : share?.galleryState === "hidden"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";

  const navItems: SidebarDialogNavItem[] = existingShareMode
    ? [
        {
          id: "share",
          label: "Share link",
          icon: <Link2 className="size-4" />,
        },
        {
          id: "actions",
          label: "Actions",
          icon: <ExternalLink className="size-4" />,
        },
      ]
    : [
        { id: "share", label: "Share", icon: <Link2 className="size-4" /> },
        ...(showEmbedSection
          ? [
              {
                id: "embed",
                label: "Embed",
                icon: <Code2 className="size-4" />,
              },
            ]
          : []),
        ...(showGallerySection
          ? [
              {
                id: "gallery",
                label: "Gallery",
                icon: <ImageIcon className="size-4" />,
              },
            ]
          : []),
        {
          id: "actions",
          label: "Actions",
          icon: <ExternalLink className="size-4" />,
        },
      ];

  const validTabs = navItems.map((i) => i.id);
  const resolvedTab: Tab = (
    validTabs.includes(activeTab) ? activeTab : "share"
  ) as Tab;

  const contentMeta: Record<Tab, { title: string; description: string }> = {
    share: {
      title: "Share link",
      description: existingShareMode
        ? "Copy or resend this published read-only link, or open Studio to make your own editable copy."
        : isAuthenticated
          ? "Publish a durable read-only link that stays live until revoked."
          : "Create a temporary read-only snapshot link and control how long it stays active.",
    },
    gallery: {
      title: "Gallery visibility",
      description:
        "Manage how this published link appears in the public gallery.",
    },
    embed: {
      title: "Embed",
      description:
        "Copy iframe code for an account-published track that stays live until revoked.",
    },
    actions: {
      title: "Actions",
      description: existingShareMode
        ? "Use the current published link in other apps or reopen it in a new tab."
        : "Open, resend, revoke, or export this share without changing the track itself.",
    },
  };

  return (
    <>
      {showGallerySection && showGalleryForm && !isGalleryVisible && (
        <GalleryPreviewRenderer onCapture={setGalleryPreviewDataUrl} />
      )}

      <SidebarDialog
        open={open}
        onOpenChange={onOpenChange}
        eyebrow={existingShareMode ? "Shared track" : "Studio"}
        title="Share"
        mobileSubtitle="Share a read-only review link for this track"
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
                      Current shared link
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Read-only {currentView.toUpperCase()} review on {hostname}
                    </p>
                  </div>
                </div>
                {currentShareUrl ? (
                  <input
                    readOnly
                    value={currentShareUrl}
                    onFocus={(e) => e.target.select()}
                    className="border-border bg-background/70 text-foreground focus:ring-primary/50 w-full min-w-0 truncate rounded-lg border px-3 py-2 font-mono text-xs outline-hidden focus:ring-1"
                  />
                ) : null}
                <Button onClick={handleCopyCurrentUrl} className="w-full">
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  Copy link
                </Button>
              </div>
            ) : (
              <>
                {showExpirySelector ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-foreground text-sm font-medium">
                        Link expires after
                      </p>
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        Temporary snapshots stay available until they expire.
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
                              "border-primary bg-primary/10 text-primary"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-border/60 bg-muted/18 rounded-xl border px-3 py-3">
                    <p className="text-foreground text-sm font-medium">
                      Published account link
                    </p>
                    <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                      Account shares stay live until you revoke them. The same
                      published track can also be embedded.
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
                            ? "Published link"
                            : "Temporary link"
                          : isAuthenticated
                            ? "No published link yet"
                            : "No temporary link yet"}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {share
                          ? getLifetimeCopy(hostname, share.expiresInDays)
                          : isAuthenticated
                            ? "Create a durable read-only track that can be shared or embedded."
                            : "Choose when it expires and create a read-only snapshot."}
                      </p>
                    </div>
                  </div>
                  {share ? (
                    <input
                      id="share-url-input"
                      readOnly
                      value={share.url}
                      onFocus={(e) => e.target.select()}
                      className="border-border bg-background/70 text-foreground focus:ring-primary/50 w-full min-w-0 truncate rounded-lg border px-3 py-2 font-mono text-xs outline-hidden focus:ring-1"
                    />
                  ) : null}
                  {linkNeedsRefresh ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-400">
                      <Share2 className="mt-0.5 size-3.5 shrink-0" />
                      <span className="leading-relaxed">
                        {shareNeedsRefresh
                          ? "This link no longer reflects the latest design."
                          : "This link no longer reflects the latest expiry selection."}
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
                      className="w-full"
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
                            className="w-full"
                          >
                            <RefreshCw className="size-4" />
                            Update link
                          </Button>
                        ) : null}
                        <Button
                          variant="destructive"
                          onClick={handleRevoke}
                          disabled={busy}
                          className="w-full"
                        >
                          <Ban className="size-4" />
                          Revoke
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
                  Loading embed state…
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
                      Publish before embedding
                    </p>
                    <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                      Embeds use the durable account-published link, so create
                      the published link before copying iframe code.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handlePublish()}
                  disabled={busy}
                  className="w-full"
                >
                  {publishing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Link2 className="size-4" />
                  )}
                  Create published link
                </Button>
              </div>
            ) : share.shareType !== "published" ? (
              <div className="space-y-2">
                <p className="text-foreground text-sm font-medium">
                  Temporary links cannot be embedded
                </p>
                <p className="text-muted-foreground text-[12px] leading-relaxed">
                  Sign in and publish this track from your account to create a
                  durable embed.
                </p>
              </div>
            ) : linkNeedsRefresh ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-400">
                  <Share2 className="mt-0.5 size-3.5 shrink-0" />
                  <span className="leading-relaxed">
                    Update the published link first so the embed uses the latest
                    design.
                  </span>
                </div>
                <Button
                  onClick={() => handlePublish(true)}
                  disabled={busy}
                  className="w-full"
                >
                  {publishing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Update link
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
                      Embed code
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Account-published tracks can be embedded on club or event
                      sites.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground text-[11px] font-medium">
                    Initial view
                  </p>
                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                    {(
                      [
                        {
                          view: "2d",
                          label: "2D layout",
                          description: "Open as the flat field plan",
                          icon: Route,
                        },
                        {
                          view: "3d",
                          label: "3D preview",
                          description: "Open in the orbit review",
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
                              ? "border-primary/50 bg-primary/10 text-primary"
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
                                  ? "text-primary/75"
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
                        Iframe code
                      </p>
                      <p className="text-muted-foreground/75 mt-0.5 text-[10px]">
                        Includes the selected initial view.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyEmbed}
                      className="w-full min-[520px]:w-auto"
                    >
                      {copiedEmbed ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      Copy code
                    </Button>
                  </div>
                  <textarea
                    readOnly
                    value={iframeCode}
                    rows={3}
                    onFocus={(e) => e.target.select()}
                    className="border-border bg-background/70 text-foreground focus:ring-primary/50 w-full min-w-0 resize-none rounded-lg border px-3 py-2 font-mono text-xs outline-hidden focus:ring-1"
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
                    Visibility
                  </p>
                  <p className="text-foreground mt-0.5 text-xs font-medium">
                    {galleryVisibilityValue}
                  </p>
                </div>
                <div className="bg-background/55 rounded-lg px-3 py-2">
                  <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
                    Share link
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
                    Publish before listing
                  </p>
                  <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                    The gallery uses the current published snapshot, so a share
                    link is required before this track can be listed.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("share")}
                  className="w-full"
                >
                  Create share link first
                </Button>
              </div>
            ) : blockedByModeration ? (
              <div className="border-destructive/25 bg-destructive/8 space-y-1.5 rounded-xl border p-3">
                <p className="text-destructive text-sm font-medium">
                  Moderation lock
                </p>
                <p className="text-destructive text-[11px] leading-relaxed">
                  This track is hidden from the gallery by moderation. The
                  direct share link can still work until it is revoked.
                </p>
              </div>
            ) : showGalleryForm ? (
              <div className="space-y-3">
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {isGalleryVisible ? "Gallery details" : "List in gallery"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                    {isGalleryVisible
                      ? "Update the title and description shown on the public gallery card."
                      : "Add a title, description and generated preview for public browsing."}
                  </p>
                </div>

                <label className="block">
                  <span className="text-muted-foreground mb-1.5 block text-[11px] font-medium">
                    Title
                  </span>
                  <input
                    value={galleryTitleInput}
                    onChange={(e) => setGalleryTitleInput(e.target.value)}
                    className="border-border bg-background/70 text-foreground focus:ring-primary/50 w-full min-w-0 rounded-lg border px-3 py-2 text-sm outline-hidden focus:ring-1"
                    placeholder="Track title"
                  />
                </label>

                <label className="block">
                  <span className="text-muted-foreground mb-1.5 block text-[11px] font-medium">
                    Description
                  </span>
                  <textarea
                    value={galleryDescriptionInput}
                    onChange={(e) => setGalleryDescriptionInput(e.target.value)}
                    maxLength={GALLERY_DESCRIPTION_MAX_LENGTH}
                    rows={3}
                    className="border-border bg-background/70 text-foreground focus:ring-primary/50 w-full min-w-0 resize-none rounded-lg border px-3 py-2 text-sm outline-hidden focus:ring-1"
                    placeholder="Short description for the gallery card"
                  />
                  <span className="text-muted-foreground mt-1 block text-right text-[10px]">
                    {galleryDescriptionInput.length}/
                    {GALLERY_DESCRIPTION_MAX_LENGTH}
                  </span>
                </label>

                {!isGalleryVisible ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-[11px]">
                      Author:{" "}
                      <span
                        className={displayNameValid ? "" : "text-destructive"}
                      >
                        {displayNameValid ? displayName : "no display name set"}
                      </span>
                    </p>

                    <div className="flex items-center gap-2">
                      {galleryPreviewDataUrl === null ? (
                        <>
                          <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
                          <span className="text-muted-foreground text-[11px]">
                            Generating preview…
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="size-3.5 text-emerald-500" />
                          <span className="text-muted-foreground text-[11px]">
                            Preview ready
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {!isGalleryVisible && shareNeedsRefresh ? (
                  <p className="text-muted-foreground text-[11px]">
                    Update the share link first so the gallery uses the latest
                    snapshot.
                  </p>
                ) : !galleryTitleValid ? (
                  <p className="text-destructive text-[11px]">
                    Add a title before saving.
                  </p>
                ) : !galleryDescriptionValid ? (
                  <p className="text-destructive text-[11px]">
                    Use {GALLERY_DESCRIPTION_MIN_LENGTH}-
                    {GALLERY_DESCRIPTION_MAX_LENGTH} characters for the
                    description.
                  </p>
                ) : !isGalleryVisible && !displayNameValid ? (
                  <p className="text-destructive text-[11px]">
                    Set an account display name first.
                  </p>
                ) : isGalleryVisible && !hasGalleryMetadataChanges ? (
                  <p className="text-muted-foreground text-[11px]">
                    Update the title or description to save changes.
                  </p>
                ) : null}

                <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowGalleryForm(false)}
                    disabled={busy}
                  >
                    Cancel
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
                  >
                    {isGalleryVisible ? "Save changes" : "Add to gallery"}
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
                          Gallery card
                        </p>
                        <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                          Review or update the public title and description for
                          this track.
                        </p>
                      </div>
                      <dl className="space-y-2 text-[12px]">
                        <div className="space-y-0.5 min-[420px]:grid min-[420px]:grid-cols-[4.5rem_1fr] min-[420px]:gap-3 min-[420px]:space-y-0">
                          <dt className="text-muted-foreground">Title</dt>
                          <dd className="text-foreground truncate font-medium">
                            {share.galleryTitle || design.title || "Untitled"}
                          </dd>
                        </div>
                        <div className="space-y-0.5 min-[420px]:grid min-[420px]:grid-cols-[4.5rem_1fr] min-[420px]:gap-3 min-[420px]:space-y-0">
                          <dt className="text-muted-foreground">Description</dt>
                          <dd className="text-muted-foreground line-clamp-2 leading-relaxed">
                            {share.galleryDescription ||
                              "No gallery description set."}
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
                        >
                          Edit details
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href="/gallery">View gallery</Link>
                        </Button>
                      </div>
                      {confirmRemoveFromGallery ? (
                        <div className="border-border/60 flex flex-col gap-2 border-t pt-3">
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            Remove from the public gallery? The share link
                            itself will continue to work until it is revoked.
                          </p>
                          <div className="flex flex-col-reverse gap-2 min-[380px]:flex-row min-[380px]:justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full min-[380px]:w-auto"
                              onClick={() => setConfirmRemoveFromGallery(false)}
                              disabled={busy}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full min-[380px]:w-auto"
                              onClick={handleUnlistFromGallery}
                              disabled={busy}
                            >
                              <Trash2 className="size-4" />
                              Remove
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
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Remove from gallery
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-foreground text-sm font-medium">
                          Ready to list
                        </p>
                        <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
                          Add this published snapshot to the public gallery with
                          its own title, description and preview.
                        </p>
                      </div>
                      {shareNeedsRefresh ? (
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Update the share link first so the gallery uses the
                          latest snapshot.
                        </p>
                      ) : null}
                      <div className="border-border/60 flex border-t pt-3 min-[520px]:justify-end">
                        <Button
                          onClick={() => {
                            setConfirmRemoveFromGallery(false);
                            setShowGalleryForm(true);
                          }}
                          disabled={busy || shareNeedsRefresh}
                          className="w-full min-[520px]:w-auto"
                        >
                          Add to gallery
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
                  ? "This page is already the published read-only review link. Share it as-is, or open Studio if you want an editable copy."
                  : hasPath
                    ? `Shared links open as read-only review pages. This link opens straight into ${currentView.toUpperCase()} review, and the route is ready for fly-through.`
                    : "Shared links open as read-only review pages. Add a path first if you want reviewers to use fly-through and elevation review."}
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
                      Share via…
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Send to apps or contacts
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
                      Open in tab
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {existingShareMode
                        ? "Reopen the current shared link in a new tab"
                        : "Preview the share link in a new window"}
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
                      Export JSON instead
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Reliable long-term backup, not URL-dependent
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
