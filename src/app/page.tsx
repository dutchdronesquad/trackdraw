import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6 py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.3),_rgba(15,23,42,0))]" />
        <div className="relative max-w-4xl space-y-6 text-center">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
            Drone Design Studio
          </span>
          <h1 className="text-4xl font-semibold sm:text-5xl">
            Ontwerp FPV parcours met precisie, hoogteprofielen en exports in één browser-tool.
          </h1>
          <p className="text-base text-slate-200 sm:text-lg">
            Teken gates, flags en cones op schaal, bouw een race line en deel de track met je team. De editor houdt rekening met echte afmetingen en hoogteverschillen zodat trainingen én wedstrijden soepel lopen.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/editor"
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-sky-400 hover:shadow-xl"
            >
              Start direct met tekenen
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-slate-200 transition hover:border-white/60 hover:text-white"
            >
              Bekijk features
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-5xl space-y-10 px-6 py-16 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-2">
          <FeatureCard
            title="Realtime schaal"
            description="Pas veldbreedte, hoogte en grid-afstand aan terwijl je werkt. Alle afstanden worden direct omgerekend naar meters."
          />
          <FeatureCard
            title="Slimme tools"
            description="Plaats gates, flags, cones en labels op het canvas met snap-to-grid, keyboard shortcuts en een handige inspector."
          />
          <FeatureCard
            title="Vlieglijn & hoogte"
            description="Teken waypoints voor de racelijn, sleep ze naar de juiste positie en stel voor elk punt de hoogte in."
          />
          <FeatureCard
            title="Import & export"
            description="Deel ontwerpen via JSON exports en laad bestaande routes opnieuw in voor latere aanpassingen."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
      <div className="text-lg font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm text-slate-200">{description}</p>
    </div>
  );
}
