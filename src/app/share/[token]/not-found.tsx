import { ArrowRight, RefreshCcw, Unlink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import SharePageStatus from "../SharePageStatus";

export default async function ShareNotFound() {
  const t = await getTranslations("share");

  return (
    <SharePageStatus
      badgeIcon={Unlink}
      badgeLabel={t("badge")}
      heading={t("notFound.heading")}
      description={t("notFound.description")}
      stepsLabel={t("whatToTry")}
      steps={[t("notFound.step1"), t("notFound.step2"), t("notFound.step3")]}
      primaryAction={{
        href: "/studio",
        label: t("openStudio"),
        icon: ArrowRight,
      }}
      secondaryAction={{ href: "/", label: t("backToHome"), icon: RefreshCcw }}
    />
  );
}
