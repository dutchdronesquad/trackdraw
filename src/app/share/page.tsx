import { redirect } from "next/navigation";

type SharePageProps = {
  searchParams: Promise<{
    d?: string | string[];
  }>;
};

export default async function SharePage({ searchParams }: SharePageProps) {
  const resolvedSearchParams = await searchParams;
  const token = Array.isArray(resolvedSearchParams.d)
    ? resolvedSearchParams.d[0]
    : resolvedSearchParams.d;

  redirect(token ? `/share/${token}` : "/");
}
