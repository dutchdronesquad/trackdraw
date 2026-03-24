import { notFound } from "next/navigation";
import { decodeDesignWithReason } from "@/lib/share";
import { parseEditorView } from "@/lib/view";
import ShareViewer from "../ShareViewer";
import ShareError from "../ShareError";

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
  const result = decodeDesignWithReason(token);

  if (!result.ok) {
    if (result.reason === "too-large") {
      return <ShareError />;
    }
    notFound();
  }

  return (
    <ShareViewer
      token={token}
      initialTab={parseEditorView(resolvedSearchParams?.view) ?? "2d"}
    />
  );
}
