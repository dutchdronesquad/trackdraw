import ClientLanguageProvider from "@/i18n/ClientLanguageProvider";
import type { MessageNamespace } from "@/i18n/catalogs";
import { pickStaticEnglishNamespaces } from "@/i18n/static-catalogs";

type StaticLanguageProviderProps = {
  namespaces: readonly MessageNamespace[];
  children: React.ReactNode;
};

export default async function StaticLanguageProvider({
  namespaces,
  children,
}: StaticLanguageProviderProps) {
  const messages = await pickStaticEnglishNamespaces(namespaces);

  return (
    <ClientLanguageProvider namespaces={namespaces} initialMessages={messages}>
      {children}
    </ClientLanguageProvider>
  );
}
