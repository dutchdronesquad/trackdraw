import { notFound } from "next/navigation";
import { decodeDesign } from "@/lib/share";
import { parseEditorView } from "@/lib/view";
import ShareViewer from "../ShareViewer";

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
  const design = decodeDesign(token);

  if (!design) {
    notFound();
  }

  return (
    <ShareViewer
      token={token}
      initialTab={parseEditorView(resolvedSearchParams?.view) ?? "2d"}
    />
  );
}
