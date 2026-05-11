import { ExplainWorkspace } from "@/components/explainer/ExplainWorkspace";

interface SharePageProps {
  params: Promise<{
    hash: string;
  }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { hash } = await params;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,0.09),transparent_24%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:auto,56px_56px,56px_56px] opacity-35" />
      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <ExplainWorkspace
          initialHash={decodeURIComponent(hash)}
          heading="Shared failed transaction report"
          subheading="This share page is stable for incident channels and postmortem notes."
          compact
        />
      </main>
    </div>
  );
}