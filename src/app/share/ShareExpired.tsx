import { ArrowRight, Clock3, RefreshCcw } from "lucide-react";
import { getTranslations } from "next-intl/server";
import SharePageStatus from "./SharePageStatus";

export default async function ShareExpired() {
  const t = await getTranslations("share");

  return (
    <SharePageStatus
      badgeIcon={Clock3}
      badgeLabel={t("badge")}
      heading={t("expired.heading")}
      description={t("expired.description")}
      stepsLabel={t("whatToTry")}
      steps={[t("expired.step1"), t("expired.step2")]}
      primaryAction={{
        href: "/studio",
        label: t("openStudio"),
        icon: ArrowRight,
      }}
      secondaryAction={{ href: "/", label: t("backToHome"), icon: RefreshCcw }}
    />
  );
}
