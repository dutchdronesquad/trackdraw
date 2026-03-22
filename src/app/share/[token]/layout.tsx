import type { Metadata } from "next";
import { decodeDesign, getShareDescription, getShareTitle } from "@/lib/share";

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
  const design = decodeDesign(token);

  if (!design) {
    return {
      title: "View Track",
      description: "View this FPV race track designed with TrackDraw.",
    };
  }

  const title = getShareTitle(design);
  const description = getShareDescription(design);
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
