import Reveal from './Reveal'

// Every section on the site opens the same way: a numbered label in the code face, a
// display headline, and — where there is one — a line of prose and an action to its
// right. Numbering them by hand is how they end up out of order, so the page passes the
// index and this writes "01", "02", "03".
const SectionHeading = ({ action, align = 'left', children, eyebrow, index, title }) => {
  const centred = align === 'center'

  return (
    <div
      className={`mb-12 flex flex-wrap items-end gap-x-8 gap-y-6 ${
        centred ? 'flex-col items-center text-center' : 'justify-between'
      }`}
    >
      <Reveal className={centred ? 'max-w-2xl' : 'max-w-2xl'}>
        <p className="mb-4 font-code text-xs uppercase tracking-[0.18em] text-blue-600 dark:text-cyan-300">
          {index ? <span className="text-slate-400 dark:text-slate-500">{String(index).padStart(2, '0')} — </span> : null}
          {eyebrow}
        </p>

        <h2 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] dark:text-white">
          {title}
        </h2>

        {/* A div rather than a paragraph: some sections put a rating or a badge in here
            beside the sentence, and those are not phrasing content. */}
        {children ? (
          <div className="mt-5 text-lg leading-relaxed text-pretty text-slate-600 dark:text-slate-300">
            {children}
          </div>
        ) : null}
      </Reveal>

      {action ? <Reveal delay={0.1}>{action}</Reveal> : null}
    </div>
  )
}

export default SectionHeading
