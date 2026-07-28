'use client'

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-[#0A1628] grid-bg text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-[#0F1E36]/90 p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-5 text-2xl">
          !
        </div>
        <h1 className="font-display text-2xl font-semibold mb-3">Something went wrong</h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          {error?.message || 'The page failed to load. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1D7FE8] to-[#10B981] text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
