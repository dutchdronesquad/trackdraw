import { resolveStoredShare } from "@/lib/server/shares";
import { parseEditorView } from "@/lib/view";
import EmbedUnavailable from "../EmbedUnavailable";
import EmbedViewer from "../EmbedViewer";

type EmbedTokenPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    view?: string;
  }>;
};

export default async function EmbedTokenPage({
  params,
  searchParams,
}: EmbedTokenPageProps) {
  const { token } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const resolvedShare = await resolveStoredShare(token);
  const shareHref = `/share/${encodeURIComponent(token)}`;

  if (resolvedShare.status === "available") {
    if (resolvedShare.share.shareType !== "published") {
      return <EmbedUnavailable reason="temporary" shareHref={shareHref} />;
    }

    return (
      <EmbedViewer
        design={resolvedShare.share.design}
        initialTab={parseEditorView(resolvedSearchParams?.view) ?? "2d"}
      />
    );
  }

  if (resolvedShare.status === "expired") {
    return <EmbedUnavailable reason="expired" />;
  }

  if (resolvedShare.status === "revoked") {
    return <EmbedUnavailable reason="revoked" />;
  }

  return <EmbedUnavailable reason="missing" />;
}
