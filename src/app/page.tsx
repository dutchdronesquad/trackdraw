import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">DDS Track Designer</h1>
      <p className="text-gray-600">Design FPV race tracks with real-world scale & altitude.</p>
      <Link className="btn" href="/editor">
        Start designing
      </Link>
    </main>
  );
}
