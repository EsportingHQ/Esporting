import { PublicNav } from '@/components/layout/public-nav';

export type LegalSection = {
  id: string;
  heading: string;
  body: React.ReactNode;
};

export const LEGAL_LAST_UPDATED = 'November 11, 2026';

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary min-h-screen relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-accent-primary/10 rounded-full blur-[140px]" />
      </div>

      <PublicNav />

      <main className="relative z-10 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-xs font-data tracking-widest text-accent-primary uppercase mb-3">
          Legal
        </p>
        <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight uppercase mb-4">
          {title}
        </h1>
        <p className="text-sm text-text-muted font-data mb-6">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
        <p className="text-text-muted font-body leading-relaxed mb-10">{intro}</p>

        <nav
          aria-label="On this page"
          className="glass rounded-2xl p-5 mb-10 text-sm font-body"
        >
          <p className="font-display font-bold text-xs tracking-wider uppercase text-text-muted mb-3">
            On this page
          </p>
          <ol className="space-y-1.5 list-decimal list-inside text-text-muted">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:text-accent-primary transition-colors">
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl font-display font-bold mb-3">
                {i + 1}. {s.heading}
              </h2>
              <div className="space-y-3 text-text-muted font-body leading-relaxed text-[15px] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-text-primary">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
