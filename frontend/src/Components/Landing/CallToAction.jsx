import { MessageCircle, Phone } from 'lucide-react'
import { INSTITUTE, telLink } from '../../utils/instituteInfo'
import { HELP_ME_CHOOSE_LINK } from '../../utils/landingContent'
import LandingButton from './LandingButton'
import Reveal from './Reveal'

// The last thing on every public page. Nobody can sign themselves up, so the ask is not
// "enrol" — it is "talk to us", on the two channels somebody actually answers.
const CallToAction = () => (
  <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
    <Reveal className="relative overflow-hidden rounded-[2.5rem] border border-blue-500/25 bg-linear-to-br from-blue-600/15 via-indigo-500/10 to-transparent p-10 backdrop-blur-xl sm:p-14 dark:border-cyan-300/15">
      <div className="animate-aurora pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/25 blur-3xl" />
      <div
        className="animate-aurora pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
        style={{ animationDelay: '-8s' }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-10">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Not sure which course? Just ask.
          </h2>

          <p className="mt-4 text-lg leading-relaxed text-pretty text-slate-600 dark:text-slate-300">
            Tell us what you are studying or where you work, and we will tell you honestly
            whether we can help — and what it will cost.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <LandingButton href={HELP_ME_CHOOSE_LINK} variant="whatsapp" size="lg">
            <MessageCircle className="h-5 w-5" />
            WhatsApp us
          </LandingButton>

          <LandingButton href={telLink} variant="outline" size="lg">
            <Phone className="h-5 w-5" />
            {INSTITUTE.phoneDisplay}
          </LandingButton>
        </div>
      </div>
    </Reveal>
  </section>
)

export default CallToAction
