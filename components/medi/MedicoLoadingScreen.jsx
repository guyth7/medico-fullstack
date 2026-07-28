import Image from 'next/image'

export default function MedicoLoadingScreen({ message = 'Loading patient record' }) {
  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A1628] px-6 text-white"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(29,127,232,0.10),transparent_38%)]" />

      <div className="relative flex flex-col items-center">
        <div className="medico-loader-stage relative h-40 w-40" aria-hidden="true">
          <div className="medico-loader-ring medico-loader-ring-primary absolute inset-1 rounded-[2.25rem] border border-sky-400/30" />
          <div className="medico-loader-ring medico-loader-ring-secondary absolute inset-1 rounded-[2.25rem] border border-emerald-400/20" />

          <div className="medico-loader-logo absolute inset-3">
            <Image
              src="/images/medico_logo_transparent.png"
              alt=""
              fill
              priority
              sizes="136px"
              className="scale-[1.12] object-contain object-center"
            />
          </div>
        </div>

        <p className="mt-7 text-sm font-medium tracking-wide text-slate-300">
          {message}
          <span className="medico-loading-dots ml-1 inline-flex w-5 justify-start" aria-hidden="true">...</span>
        </p>
        <span className="sr-only">{message}. Please wait.</span>
      </div>
    </section>
  )
}
