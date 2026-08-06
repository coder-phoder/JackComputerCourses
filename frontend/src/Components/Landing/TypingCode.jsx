import { useEffect, useMemo, useState } from 'react'
import { HERO_SCRIPT } from '../../utils/landingContent'
import { prefersReducedMotion } from '../../utils/webgl'

const CHAR_INTERVAL_MS = 32
const HOLD_MS = 3400

const TOKEN_PATTERN = /("[^"]*"|#[^\n]*|>>>|\b(?:for|in|range|print|def|return|if|else|import)\b|\b\d+\b)/g

const TOKEN_CLASS = {
  comment: 'text-slate-500 dark:text-slate-500',
  keyword: 'text-fuchsia-600 dark:text-fuchsia-300',
  string: 'text-emerald-600 dark:text-emerald-300',
  number: 'text-amber-600 dark:text-amber-300',
  output: 'text-cyan-600 dark:text-cyan-300',
  plain: 'text-slate-700 dark:text-slate-200',
}

const classify = (piece) => {
  if (piece.startsWith('#')) return TOKEN_CLASS.comment
  if (piece.startsWith('"')) return TOKEN_CLASS.string
  if (piece === '>>>') return TOKEN_CLASS.output
  if (/^\d+$/.test(piece)) return TOKEN_CLASS.number
  if (/^[a-z]+$/.test(piece)) return TOKEN_CLASS.keyword

  return TOKEN_CLASS.plain
}

// The script is coloured once, into a short list of runs. Typing then only decides how
// many characters of that list are on screen, so a frame costs a slice and not a parse.
const tokenize = (source) => {
  const tokens = []
  let cursor = 0

  source.replace(TOKEN_PATTERN, (match, _group, offset) => {
    if (offset > cursor) {
      tokens.push({ text: source.slice(cursor, offset), className: TOKEN_CLASS.plain })
    }

    tokens.push({ text: match, className: classify(match) })
    cursor = offset + match.length

    return match
  })

  if (cursor < source.length) {
    tokens.push({ text: source.slice(cursor), className: TOKEN_CLASS.plain })
  }

  return tokens
}

// The editor a student meets on day one, typing itself out. It is the only claim the
// hero makes that the reader can check on the spot: this is what the portal looks like.
const TypingCode = () => {
  const tokens = useMemo(() => tokenize(HERO_SCRIPT), [])
  const [visible, setVisible] = useState(() => (prefersReducedMotion() ? HERO_SCRIPT.length : 0))

  // The coloured runs, cut off at however many characters have been typed. Whole runs
  // are kept, the run the caret is inside is sliced, and everything after it is dropped.
  const typed = useMemo(() => {
    const runs = []
    let budget = visible

    for (const token of tokens) {
      if (budget <= 0) {
        break
      }

      const text = token.text.slice(0, budget)
      budget -= text.length
      runs.push({ text, className: token.className })
    }

    return runs
  }, [tokens, visible])

  useEffect(() => {
    if (prefersReducedMotion()) {
      return undefined
    }

    let frameId = null
    let lastStep = 0
    let holdUntil = 0

    const step = (now) => {
      frameId = requestAnimationFrame(step)

      if (holdUntil) {
        if (now < holdUntil) {
          return
        }

        holdUntil = 0
        setVisible(0)
        lastStep = now

        return
      }

      if (now - lastStep < CHAR_INTERVAL_MS) {
        return
      }

      lastStep = now

      setVisible((count) => {
        const next = count + 1

        if (next >= HERO_SCRIPT.length) {
          holdUntil = now + HOLD_MS
        }

        return Math.min(next, HERO_SCRIPT.length)
      })
    }

    frameId = requestAnimationFrame(step)

    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 rounded-4xl bg-blue-500/20 blur-3xl dark:bg-blue-600/25" />

      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#020617]/85 dark:shadow-black/60">
        <div className="flex items-center gap-2.5 border-b border-slate-200/80 bg-slate-100/70 px-4 py-3 dark:border-white/10 dark:bg-white/4">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-2 font-code text-xs text-slate-500 dark:text-slate-400">
            practice.py — JackCourses editor
          </span>
        </div>

        <div className="relative min-h-68 px-5 py-5 sm:min-h-76">
          <div className="animate-scanline pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-cyan-400/10 to-transparent" />

          <pre className="relative font-code text-[13.5px] leading-relaxed whitespace-pre-wrap wrap-break-word sm:text-sm">
            {typed.map((run, index) => (
              <span key={index} className={run.className}>
                {run.text}
              </span>
            ))}
            <span className="animate-caret ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-cyan-500 dark:bg-cyan-300" />
          </pre>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-100/70 px-4 py-3 font-code text-xs text-slate-500 dark:border-white/10 dark:bg-white/4 dark:text-slate-400">
          <span>Runs in the browser — nothing to install</span>
          <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
            <span className="animate-breathe h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ready
          </span>
        </div>
      </div>

      <div className="animate-float absolute -left-4 -top-5 rounded-2xl border border-cyan-400/40 bg-white/90 px-4 py-2.5 text-xs font-medium text-cyan-700 shadow-xl backdrop-blur sm:-left-8 dark:bg-[#020617]/90 dark:text-cyan-200">
        Batches 9 AM — 9 PM
      </div>

      <div className="animate-float-slow absolute -bottom-6 -right-3 rounded-2xl border border-indigo-400/40 bg-white/90 px-4 py-2.5 text-xs font-medium text-indigo-700 shadow-xl backdrop-blur sm:-right-6 dark:bg-[#020617]/90 dark:text-indigo-200">
        Doubt? Ask your faculty
      </div>
    </div>
  )
}

export default TypingCode
