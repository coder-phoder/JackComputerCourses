import LandingLayout from '../../Components/Landing/LandingLayout'
import Reveal from '../../Components/Landing/Reveal'
import SectionHeading from '../../Components/Landing/SectionHeading'
import SpotlightCard from '../../Components/Landing/SpotlightCard'
import { INSTITUTE } from '../../utils/instituteInfo'
import { FACULTY, INSTITUTE_FACTS, TEACHING_APPROACH } from '../../utils/landingContent'

const AboutPage = () => (
  <LandingLayout>
    <section className="mx-auto grid max-w-7xl gap-14 px-4 pb-12 pt-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pt-24">
      <div>
        <Reveal as="p" className="font-code text-xs uppercase tracking-[0.18em] text-blue-600 dark:text-cyan-300">
          About us
        </Reveal>

        <Reveal as="h1" delay={0.06} className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-[3.4rem] dark:text-white">
          A computer class in Chandkheda, run by people who still teach.
        </Reveal>

        <div className="mt-8 grid gap-5 text-lg leading-relaxed text-pretty text-slate-600 dark:text-slate-300">
          <Reveal as="p" delay={0.12}>
            {INSTITUTE.legalName} has been teaching in Chandkheda since {INSTITUTE.since}.
            We are not a franchise and we do not run 200-seat halls. Five faculty, a lab
            full of computers, and batches small enough that we know who has fallen behind.
          </Reveal>

          <Reveal as="p" delay={0.16}>
            Nobody here is rushed through a syllabus. If a topic needs an extra session, it
            gets one — the point is that you can do it yourself afterwards, not that we
            finished on schedule.
          </Reveal>

          <Reveal as="p" delay={0.2}>
            And because class time is never enough, we built our own student portal: notes,
            a course player, a code editor and a way to ask your faculty a question at 11 PM.
          </Reveal>
        </div>
      </div>

      <div className="grid gap-4 self-start">
        {INSTITUTE_FACTS.map((fact, index) => (
          <Reveal key={fact.k} delay={index * 0.07}>
            <SpotlightCard className="p-6">
              <p className="font-display text-base font-semibold text-slate-900 dark:text-white">{fact.k}</p>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-600 dark:text-slate-400">{fact.v}</p>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="The people" title="Who teaches you">
        Five faculty, each on their own subject. You will be taught by the same person for
        the whole course — not a rotating panel.
      </SectionHeading>

      <div className="grid gap-5 md:grid-cols-3">
        {FACULTY.map((person, index) => (
          <Reveal key={person.role} delay={index * 0.08} className="h-full">
            <SpotlightCard className="h-full p-8">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/25 bg-linear-to-br from-blue-500/20 to-indigo-500/10 font-display text-lg font-bold text-blue-700 dark:border-cyan-300/20 dark:text-cyan-200">
                  {person.count}
                </span>

                <div>
                  <p className="font-display text-base font-semibold text-slate-900 dark:text-white">{person.role}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{person.label}</p>
                </div>
              </div>

              <p className="mt-6 text-[0.95rem] leading-relaxed text-pretty text-slate-600 dark:text-slate-400">
                {person.body}
              </p>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <Reveal>
        <SpotlightCard className="p-10 sm:p-14" glow="oklch(0.7 0.16 210)">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            How we teach
          </h2>

          <div className="mt-10 grid gap-10 sm:grid-cols-2">
            {TEACHING_APPROACH.map((item) => (
              <div key={item.tag}>
                <p className="font-code text-[11px] uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
                  {item.tag}
                </p>
                <p className="mt-3 leading-relaxed text-pretty text-slate-600 dark:text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </Reveal>
    </section>
  </LandingLayout>
)

export default AboutPage
