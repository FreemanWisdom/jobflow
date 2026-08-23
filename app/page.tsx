const features = [
  {
    number: "01",
    title: "Manage jobs",
    description:
      "Keep projects, clients, deadlines, and priorities in one clear, dependable workspace.",
  },
  {
    number: "02",
    title: "Organize tasks",
    description:
      "Break every job into focused, actionable tasks so the next step is always clear.",
  },
  {
    number: "03",
    title: "Track progress",
    description:
      "See what is complete, what remains, and how each project is moving forward.",
  },
];

function JobFlowMark() {
  return (
    <span className="inline-flex h-6 w-6 items-end gap-1 pb-0.5" aria-hidden="true">
      <i className="h-2.5 w-1.5 rounded-sm bg-violet-600" />
      <i className="h-5 w-1.5 rounded-sm bg-violet-600" />
      <i className="h-3.5 w-1.5 rounded-sm bg-violet-600" />
    </span>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-slate-200/80 bg-stone-50">
        <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8" aria-label="Main navigation">
          <a href="#top" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900">
            <JobFlowMark />
            <span>jobflow</span>
          </a>
          <div className="flex items-center gap-3 sm:gap-6">
            <a href="#sign-in" className="text-sm font-medium text-slate-600 transition hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">Sign in</a>
            <a href="#get-started" className="rounded-md bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600 sm:px-5">Get started</a>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28 lg:pb-36 lg:pt-36">
          <div className="max-w-3xl">
            <p className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Work, made clearer</p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.03] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">Turn work into progress.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">JobFlow gives you a calm place to manage jobs, organize tasks, track deadlines, and keep every piece of work moving from start to finish.</p>
            <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <a id="get-started" href="#features" className="inline-flex min-h-12 items-center justify-center rounded-md bg-violet-700 px-6 text-sm font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">Get started <span className="ml-2 text-lg leading-none" aria-hidden="true">→</span></a>
              <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">See how it works</a>
            </div>
          </div>
          <div className="mt-16 max-w-5xl border border-slate-200 bg-white p-5 sm:mt-20 sm:p-8" aria-label="JobFlow workspace preview">
            <div className="mb-7 flex items-center justify-between border-b border-slate-100 pb-5"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-violet-600"/><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/></div><span className="text-xs font-medium text-slate-400">Your workspace</span></div>
            <div className="grid gap-6 md:grid-cols-[1.25fr_.75fr]"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active jobs</p><div className="mt-4 space-y-3"><div className="border border-slate-200 p-4"><div className="flex justify-between gap-4"><div><p className="font-semibold text-slate-800">Website redesign</p><p className="mt-1 text-sm text-slate-500">Linear Labs · Due Aug 28</p></div><span className="text-sm font-semibold text-violet-700">72%</span></div><div className="mt-4 h-1.5 overflow-hidden bg-slate-100"><div className="h-full w-[72%] bg-violet-600"/></div></div><div className="border border-slate-200 p-4"><div className="flex justify-between gap-4"><div><p className="font-semibold text-slate-800">Mobile app design system</p><p className="mt-1 text-sm text-slate-500">Momentum · Due Sep 04</p></div><span className="text-sm font-semibold text-violet-700">45%</span></div><div className="mt-4 h-1.5 overflow-hidden bg-slate-100"><div className="h-full w-[45%] bg-violet-600"/></div></div></div></div><div className="border-t border-slate-200 pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Up next</p><ul className="mt-4 space-y-4 text-sm"><li className="flex gap-3"><span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center border border-violet-600 bg-violet-600 text-[10px] text-white">✓</span><span className="text-slate-500 line-through">Create homepage wireframes</span></li><li className="flex gap-3"><span className="mt-0.5 h-4 w-4 shrink-0 border border-slate-300"/><span className="font-medium text-slate-700">Review client feedback</span></li><li className="flex gap-3"><span className="mt-0.5 h-4 w-4 shrink-0 border border-slate-300"/><span className="font-medium text-slate-700">Set up component library</span></li></ul></div></div>
          </div>
        </section>

        <section id="features" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Built for focused work</p><h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Everything you need to keep work moving.</h2></div><div className="mt-12 grid gap-4 md:grid-cols-3">{features.map((feature)=><article key={feature.number} className="border border-slate-200 p-7 transition hover:border-violet-300"><p className="text-sm font-bold text-violet-700">{feature.number}</p><h3 className="mt-10 text-xl font-semibold tracking-[-0.02em] text-slate-900">{feature.title}</h3><p className="mt-3 leading-7 text-slate-600">{feature.description}</p></article>)}</div></div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28"><div className="grid gap-10 border-l-2 border-violet-600 pl-6 sm:grid-cols-[1fr_auto] sm:items-end sm:pl-8"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">A better rhythm</p><h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">From a job&apos;s first note to its final checkmark.</h2><p className="mt-5 max-w-xl leading-7 text-slate-600">Capture the work, make a plan, and see meaningful progress without losing track of the details.</p></div><a id="sign-in" href="#top" className="text-sm font-semibold text-violet-700 hover:text-violet-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">Explore JobFlow →</a></div></section>
      </main>
      <footer className="border-t border-slate-200"><div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-semibold text-slate-700">JobFlow</span><span>Turn work into progress.</span></div></footer>
    </div>
  );
}
