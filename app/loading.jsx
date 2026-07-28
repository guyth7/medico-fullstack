export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0A1628] grid-bg text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-11 h-11 rounded-xl bg-white/10 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-40 rounded bg-white/5 animate-pulse" />
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="h-6 w-48 rounded-full bg-white/10 animate-pulse mx-auto" />
          <div className="h-14 rounded bg-white/10 animate-pulse" />
          <div className="h-5 rounded bg-white/5 animate-pulse" />
          <div className="h-5 w-5/6 rounded bg-white/5 animate-pulse mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-white/10 animate-pulse" />
                <div className="w-5 h-5 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="h-6 w-32 rounded bg-white/10 animate-pulse mb-3" />
              <div className="space-y-2 mb-6">
                <div className="h-4 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-4/5 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
