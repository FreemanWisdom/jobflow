"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-5 text-center text-slate-900">
      <div>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500">We could not load this workspace right now.</p>
        <button onClick={reset} className="mt-5 rounded-md bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800">Try again</button>
      </div>
    </main>
  );
}