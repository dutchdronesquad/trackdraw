import type { ReactNode } from "react";
import { ArrowRight, Ban, FileJson } from "lucide-react";
import { getTranslations } from "next-intl/server";
import SharePageStatus from "./SharePageStatus";

export default async function ShareRevoked() {
  const t = await getTranslations("share");
  const strong = (chunks: ReactNode) => (
    <strong className="text-foreground/80 font-semibold">{chunks}</strong>
  );

  return (
    <SharePageStatus
      badgeIcon={Ban}
      badgeLabel={t("badge")}
      heading={t("revoked.heading")}
      description={t("revoked.description")}
      stepsLabel={t("error.whatToDo")}
      steps={[t("revoked.step1"), t.rich("revoked.step2", { strong })]}
      primaryAction={{
        href: "/studio",
        label: t("error.openStudioToImport"),
        icon: FileJson,
      }}
      secondaryAction={{ href: "/", label: t("backToHome"), icon: ArrowRight }}
    />
  );
}
