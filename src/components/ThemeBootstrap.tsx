import { buildThemeBootstrapScript } from "@/lib/theme";

export default function ThemeBootstrap() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: buildThemeBootstrapScript() }}
      suppressHydrationWarning
    />
  );
}
