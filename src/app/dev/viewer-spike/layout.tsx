import LanguageProvider from "@/i18n/LanguageProvider";

export default function ViewerSpikeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider namespaces={["devTools"]}>{children}</LanguageProvider>
  );
}
