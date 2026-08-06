import { TICKER_WORDS } from '../../utils/landingContent'

// Everything the institute teaches, running past in one line. The list is laid out twice
// inside a track that slides exactly half its own width, so the seam between the last
// word and the first never shows.
const Ticker = () => (
  <div className="relative overflow-hidden border-y border-slate-200/70 bg-white/40 py-4 backdrop-blur dark:border-white/5 dark:bg-white/2">
    <div className="animate-marquee flex w-max">
      {[0, 1].map((copy) => (
        <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-10 pr-10">
          {TICKER_WORDS.map((word) => (
            <span
              key={word}
              className="flex items-center gap-10 whitespace-nowrap font-code text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500"
            >
              {word}
              <span className="h-1 w-1 rounded-full bg-blue-500/60 dark:bg-cyan-400/50" />
            </span>
          ))}
        </div>
      ))}
    </div>

    {/* The line does not stop, it fades — the track keeps moving behind these edges. */}
    <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r from-slate-50 to-transparent dark:from-[#020617]" />
    <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l from-slate-50 to-transparent dark:from-[#020617]" />
  </div>
)

export default Ticker
