import type { Metadata } from "next";
import { getShareDescription, getShareTitle } from "@/lib/share";
import { resolveShareView } from "@/lib/server/share-resolution";

type ShareTokenLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    token: string;
  }>;
};

export async function generateMetadata({
  params,
}: ShareTokenLayoutProps): Promise<Metadata> {
  const { token } = await params;
  const resolvedShare = await resolveShareView(token);

  if (resolvedShare.status === "expired") {
    return {
      title: "Expired Track Share",
      description:
        "This TrackDraw share link has expired. Ask the sender to publish a fresh link.",
    };
  }

  if (resolvedShare.status !== "available") {
    return {
      title: "View Track",
      description: "View this FPV race track designed with TrackDraw.",
    };
  }

  const design = resolvedShare.design;

  const title =
    resolvedShare.source === "stored"
      ? resolvedShare.title
      : getShareTitle(design);
  const description =
    resolvedShare.source === "stored"
      ? resolvedShare.description
      : getShareDescription(design);
  const encodedToken = encodeURIComponent(token);

  return {
    title,
    description,
    alternates: {
      canonical: `/share/${encodedToken}`,
    },
    openGraph: {
      title,
      description,
      url: `/share/${encodedToken}`,
      images: [`/share/${encodedToken}/opengraph-image`],
    },
    twitter: {
      title,
      description,
      images: [`/share/${encodedToken}/twitter-image`],
    },
  };
}

export default function ShareTokenLayout({ children }: ShareTokenLayoutProps) {
  return <>{children}</>;
}
