import { notFound } from "next/navigation";
import { resolveShareView } from "@/lib/server/share-resolution";
import { parseEditorView } from "@/lib/view";
import ShareViewer from "../ShareViewer";
import ShareError from "../ShareError";
import ShareExpired from "../ShareExpired";

type ShareTokenPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    view?: string;
  }>;
};

export default async function ShareTokenPage({
  params,
  searchParams,
}: ShareTokenPageProps) {
  const { token } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const resolvedShare = await resolveShareView(token);

  if (resolvedShare.status === "available") {
    return (
      <ShareViewer
        design={resolvedShare.design}
        studioSeedToken={resolvedShare.studioSeedToken}
        initialTab={parseEditorView(resolvedSearchParams?.view) ?? "2d"}
      />
    );
  }

  if (resolvedShare.status === "expired") {
    return <ShareExpired />;
  }

  if (resolvedShare.status === "revoked") {
    notFound();
  }

  if (resolvedShare.status === "retired") {
    return <ShareError />;
  }

  notFound();
}
