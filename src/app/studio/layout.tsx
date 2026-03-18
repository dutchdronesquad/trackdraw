import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio",
  description: "Design your FPV race track to scale, add gates and obstacles, and preview in 3D.",
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
