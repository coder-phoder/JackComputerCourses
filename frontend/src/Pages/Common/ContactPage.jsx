import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import EnquiryForm from '../../Components/Landing/EnquiryForm'
import LandingButton from '../../Components/Landing/LandingButton'
import LandingLayout from '../../Components/Landing/LandingLayout'
import Reveal from '../../Components/Landing/Reveal'
import SpotlightCard from '../../Components/Landing/SpotlightCard'
import { INSTITUTE, mailLink, telLink } from '../../utils/instituteInfo'
import { QUESTION_LINK } from '../../utils/landingContent'

const CHANNELS = [
  {
    icon: MessageCircle,
    tag: 'WhatsApp',
    value: INSTITUTE.phoneDisplay,
    note: `Fastest. Replies between ${INSTITUTE.openingHours}.`,
    href: QUESTION_LINK,
  },
  {
    icon: Phone,
    tag: 'Call',
    value: INSTITUTE.phoneDisplay,
    note: 'If you would rather just talk to someone.',
    href: telLink,
  },
  {
    icon: Mail,
    tag: 'Email',
    value: INSTITUTE.email,
    note: 'For anything long, or documents.',
    href: mailLink,
  },
  {
    icon: MapPin,
    tag: 'Visit',
    value: 'Rudrax Complex, Chandkheda',
    note: '109, IOC Road, near Shantikunj Society.',
    href: INSTITUTE.mapsUrl,
  },
]

const MAP_EMBED_URL = 'https://www.google.com/maps?q=Rudrax+Complex+IOC+Road+Chandkheda+Ahmedabad+382424&output=embed'

// The closing "talk to us" band every other page ends on would only repeat this page
// back to itself, so it is left off here.
const ContactPage = () => (
  <LandingLayout hideCallToAction>
    <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-24">
      <Reveal as="p" className="font-code text-xs uppercase tracking-[0.18em] text-blue-600 dark:text-cyan-300">
        Contact us
      </Reveal>

      <Reveal as="h1" delay={0.06} className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
        Ask us anything. WhatsApp is fastest.
      </Reveal>

      <Reveal as="p" delay={0.12} className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-slate-600 dark:text-slate-300">
        Someone reads every message between 9 AM and 9 PM. No call centre, no follow-up
        spam — just a straight answer about fees, timings and whether a course suits you.
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHANNELS.map((channel, index) => {
          const opensElsewhere = /^https?:/i.test(channel.href)

          return (
            <Reveal key={channel.tag} delay={index * 0.06} className="h-full">
              <SpotlightCard
                as="a"
                href={channel.href}
                target={opensElsewhere ? '_blank' : undefined}
                rel={opensElsewhere ? 'noopener noreferrer' : undefined}
                className="block h-full p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/25 bg-linear-to-br from-blue-500/20 to-indigo-500/10 text-blue-700 transition-transform duration-500 group-hover:-translate-y-1 dark:border-cyan-300/20 dark:text-cyan-200">
                  <channel.icon className="h-5 w-5" />
                </span>

                <p className="mt-5 font-code text-[11px] uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
                  {channel.tag}
                </p>

                <p className="mt-2 font-display text-base font-semibold wrap-break-word text-slate-900 dark:text-white">
                  {channel.value}
                </p>

                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{channel.note}</p>
              </SpotlightCard>
            </Reveal>
          )
        })}
      </div>
    </section>

    <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
      <Reveal>
        <SpotlightCard className="h-full p-8 sm:p-10">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Send an enquiry
          </h2>

          <p className="mt-3 mb-8 text-[0.95rem] leading-relaxed text-slate-600 dark:text-slate-400">
            Fill this in and it opens WhatsApp with your details already typed. Nothing is
            stored on this page.
          </p>

          <EnquiryForm />
        </SpotlightCard>
      </Reveal>

      <div className="grid content-start gap-6">
        <Reveal delay={0.08}>
          <SpotlightCard className="p-8">
            <p className="font-code text-[11px] uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
              Visit the lab
            </p>

            <address className="mt-5 text-lg leading-relaxed not-italic text-slate-700 dark:text-slate-200">
              {INSTITUTE.addressLines.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </address>

            <LandingButton href={INSTITUTE.mapsUrl} variant="outline" size="sm" className="mt-6">
              <MapPin className="h-4 w-4" />
              Open in Google Maps
            </LandingButton>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10">
              <iframe
                title={`Map to ${INSTITUTE.legalName}`}
                src={MAP_EMBED_URL}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-56 w-full grayscale-[0.35] transition duration-500 hover:grayscale-0 dark:opacity-90"
              />
            </div>
          </SpotlightCard>
        </Reveal>

        <Reveal delay={0.14}>
          <SpotlightCard className="p-8" glow="oklch(0.75 0.14 195)">
            <p className="font-code text-[11px] uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
              Timings
            </p>

            <p className="mt-4 flex items-center gap-3 font-display text-3xl font-bold text-slate-900 dark:text-white">
              <Clock className="h-7 w-7 text-blue-600 dark:text-cyan-300" />
              {INSTITUTE.openingHours}
            </p>

            <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">
              Walk in any time within those hours. If you are coming from far, message
              first so a faculty is free to sit with you.
            </p>
          </SpotlightCard>
        </Reveal>
      </div>
    </section>
  </LandingLayout>
)

export default ContactPage
