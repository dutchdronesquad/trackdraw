import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "View Track",
  description: "View this FPV race track designed with TrackDraw.",
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
