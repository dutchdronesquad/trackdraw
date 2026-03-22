import { notFound } from "next/navigation";
import { decodeDesign } from "@/lib/share";
import ShareViewer from "../ShareViewer";

type ShareTokenPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ShareTokenPage({ params }: ShareTokenPageProps) {
  const { token } = await params;
  const design = decodeDesign(token);

  if (!design) {
    notFound();
  }

  return <ShareViewer token={token} />;
}
