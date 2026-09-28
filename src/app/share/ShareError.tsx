import type { ReactNode } from "react";
import { ArrowRight, FileJson, Unlink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import SharePageStatus from "./SharePageStatus";

export default async function ShareError() {
  const t = await getTranslations("share");
  const strong = (chunks: ReactNode) => (
    <strong className="text-foreground/80 font-semibold">{chunks}</strong>
  );

  return (
    <SharePageStatus
      badgeIcon={Unlink}
      badgeLabel={t("badge")}
      heading={t("error.heading")}
      description={t("error.description")}
      stepsLabel={t("error.whatToDo")}
      steps={[
        t.rich("error.step1", { strong }),
        t.rich("error.step2", { strong }),
        t("error.step3"),
      ]}
      primaryAction={{
        href: "/studio",
        label: t("error.openStudioToImport"),
        icon: FileJson,
      }}
      secondaryAction={{ href: "/", label: t("backToHome"), icon: ArrowRight }}
    />
  );
}
