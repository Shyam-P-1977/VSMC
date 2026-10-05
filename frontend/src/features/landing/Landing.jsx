import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, BatteryCharging, CalendarCheck, Car, CheckCircle2, ClipboardCheck, CreditCard, Droplets, Fuel,
  Gauge, ShieldCheck, Snowflake, Sparkles, Truck, UserPlus, Wrench, Zap, Disc3, Settings2, Receipt, Star, Plus, Minus
} from 'lucide-react'
import { PublicHeader } from './PublicShell'
import { Logo, cx } from '../../components/ui'

const SERVICES = [
  ['General Service', 'Multi-point inspection & tune-up', 2499, Wrench],
  ['Oil Change', 'Engine oil & filter replacement', 1299, Droplets],
  ['Brake Repair', 'Pads, discs & brake fluid', 1999, Disc3],
  ['Engine Check-up', 'Computerised diagnostics', 1499, Gauge],
  ['Battery Replacement', 'Health test & new battery fitting', 499, BatteryCharging],
  ['Wheel Alignment & Balancing', '4-wheel computerised alignment', 1199, Settings2],
  ['AC Service', 'Gas top-up & cooling check', 1799, Snowflake],
  ['Car Wash & Cleaning', 'Foam wash & interior detailing', 599, Sparkles],
  ['Emergency Breakdown Assistance', 'Mechanic dispatched to you', 1499, Zap],
  ['Emergency Fuel Delivery', 'Fuel brought to where you are', 399, Fuel],
  ['Pick-up & Drop Service', 'Doorstep pick-up and drop', 349, Truck],
]

const STEPS = [
  ['Register', 'Create your free account', UserPlus],
  ['Add Vehicle', 'Save your car details', Car],
  ['Book', 'Pick services & a time slot', CalendarCheck],
  ['Assign', 'We assign a mechanic', ClipboardCheck],
  ['Service', 'Track progress live', Wrench],
  ['Invoice', 'Itemised bill, GST included', Receipt],
  ['Pay', 'Pay online securely', CreditCard],
]

const FAQS = [
  ['Do I have to pay upfront?', 'No, you only pay after the service is completed and you receive an itemized invoice. We accept UPI, Card, and NetBanking.'],
  ['Can I track my car service?', 'Yes! Our live timeline feature lets you track the exact status of your car—from assigned mechanic to work in progress and completion.'],
  ['What if my car breaks down on the road?', 'We offer Emergency Breakdown Assistance. You can book an urgent request and our mechanic will be dispatched to your location.'],
  ['Are the spare parts genuine?', 'Absolutely. We only use OEM (Original Equipment Manufacturer) or OES parts with warranty. You can view all parts used in your digital invoice.'],
]

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } }

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="bg-bg text-ink overflow-hidden">
      {/* HERO */}
      <section className="relative bg-night-900 text-white min-h-screen flex flex-col">
        <div className="hero-grid absolute inset-0 opacity-40" />
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} className="absolute -left-24 top-10 h-[500px] w-[500px] rounded-full bg-brand-500/20 blur-[120px]" />
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} className="absolute -right-20 bottom-0 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[120px]" />
        
        <PublicHeader dark />
        
        <div className="relative mx-auto grid max-w-7xl flex-1 items-center gap-12 px-4 pb-24 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-0">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-sm font-semibold text-brand-300 ring-1 ring-brand-400/30 shadow-sm backdrop-blur-md">
              <ShieldCheck className="h-4 w-4" /> Trusted 5-Star Rated Service Center
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.15] tracking-tight sm:text-6xl lg:text-7xl">
              Car care that runs <br className="hidden lg:block"/>
              <span className="bg-gradient-to-r from-brand-400 via-brand-200 to-indigo-300 bg-clip-text text-transparent">on your schedule.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300 leading-relaxed">
              Book a slot, follow your car's repair in real time, get a transparent itemised invoice and pay online — no phone calls, no paperwork.
            </p>
            
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" className="btn bg-brand-500 hover:bg-brand-400 text-night-900 border-none !px-8 !py-4 text-base shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]">
                Book a Service <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/login" className="btn !border-white/20 bg-white/5 !px-8 !py-4 text-base text-white hover:bg-white/10 backdrop-blur-sm">
                Log in
              </Link>
            </div>
            
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-slate-300">
              {['Live timeline', 'GST-ready invoices', 'Secure payments'].map((t) => (
                <div key={t} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-brand-400" />{t}</div>
              ))}
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="relative hidden lg:block">
            <div className="card relative mx-auto max-w-md overflow-hidden border-white/10 bg-night-800/60 p-7 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
              <div className="mb-6 flex items-center justify-between">
                <Logo light />
                <span className="badge bg-indigo-500/20 text-indigo-300 ring-1 ring-inset ring-indigo-400/30">In Progress</span>
              </div>
              <p className="text-sm text-slate-400 font-medium">Job #1042 · MH12AB1234</p>
              <p className="font-display text-2xl font-bold text-white mt-1">Swift · General Service</p>
              
              <div className="mt-8 space-y-5 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-white/10">
                {[['Booked', true], ['Mechanic assigned', true], ['Service in progress', true], ['Invoice ready', false]].map(([t, done], i) => (
                  <div key={t} className="flex items-center gap-4 relative z-10">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold shadow-md transition-colors duration-500 ${done ? 'bg-brand-500 text-night-900 ring-4 ring-night-800' : 'bg-night-700 text-slate-400 ring-4 ring-night-800'}`}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span className={`font-medium ${done ? 'text-white' : 'text-slate-500'}`}>{t}</span>
                  </div>
                ))}
              </div>
              
              <div className="relative mt-10 h-12 overflow-hidden rounded-xl bg-night-900/50 shadow-inner">
                <div className="absolute inset-x-0 bottom-2 h-px bg-white/10" />
                <Car className="absolute bottom-1.5 h-7 w-7 animate-drive text-brand-400" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS & TESTIMONIALS STRIP */}
      <section className="border-b border-line bg-surface py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-line text-center">
            {[
              { value: '10k+', label: 'Cars Serviced' },
              { value: '4.9/5', label: 'Average Rating' },
              { value: '15+', label: 'Expert Mechanics' },
              { value: '100%', label: 'Genuine Parts' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="text-3xl font-extrabold text-ink">{stat.value}</div>
                <div className="mt-1 text-sm font-semibold uppercase tracking-wider text-muted">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 relative" id="services">
        <div className="absolute top-0 right-0 -mr-48 -mt-48 h-96 w-96 rounded-full bg-brand-50/50 blur-[100px] -z-10" />
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-600 mb-3">Our Expertise</p>
          <h2 className="text-4xl font-extrabold text-ink">Every service your car needs</h2>
          <p className="mt-4 text-lg text-muted">Transparent indicative pricing. Final bill is based on actual labour and spare parts used.</p>
        </div>
        
        <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SERVICES.map(([name, desc, price, Icon]) => (
            <motion.div variants={itemVariants} key={name} className="card p-6 group cursor-pointer hover:border-brand-300">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-500/30">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-ink group-hover:text-brand-600 transition-colors">{name}</h3>
              <p className="text-sm text-muted leading-relaxed min-h-[40px]">{desc}</p>
              <div className="mt-5 pt-5 border-t border-line flex items-center justify-between">
                <span className="text-sm font-semibold text-muted uppercase">From</span>
                <span className="text-lg font-bold text-ink group-hover:text-brand-600 transition-colors">₹{price.toLocaleString('en-IN')}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* WORKFLOW */}
      <section className="bg-surface-2 py-24 border-y border-line" id="how-it-works">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-600 mb-3">How it works</p>
            <h2 className="text-4xl font-extrabold text-ink">From booking to billing in seven steps</h2>
          </div>
          
          <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7 relative">
            {/* Connection line for desktop */}
            <div className="hidden lg:block absolute top-10 left-10 right-10 h-0.5 bg-line z-0" />
            
            {STEPS.map(([t, d, Icon], i) => (
              <motion.div variants={itemVariants} key={t} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-surface rounded-2xl shadow-sm border border-line flex items-center justify-center mb-5 relative group transition-all duration-300 hover:shadow-md hover:border-brand-400 hover:-translate-y-1">
                  <span className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold shadow-sm ring-4 ring-surface-2">
                    {i + 1}
                  </span>
                  <Icon className="h-8 w-8 text-brand-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="font-bold text-ink">{t}</h3>
                <p className="mt-2 text-sm text-muted">{d}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-24 sm:px-6 relative">
        <div className="absolute top-1/2 left-0 -ml-48 h-96 w-96 rounded-full bg-indigo-50/50 blur-[100px] -z-10" />
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-ink">Frequently asked questions</h2>
        </div>
        
        <div className="space-y-4">
          {FAQS.map(([q, a], i) => (
            <div key={i} className="card overflow-hidden transition-all duration-200">
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between p-6 text-left focus:outline-none focus-visible:bg-surface-2"
              >
                <span className="font-bold text-lg text-ink">{q}</span>
                <span className="ml-6 flex shrink-0 items-center justify-center rounded-full bg-surface-2 p-1.5 text-muted transition-colors hover:text-brand-600">
                  {openFaq === i ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <div className="p-6 pt-0 text-muted leading-relaxed">
                      {a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 mb-12">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 to-night-900 p-12 text-center text-white shadow-2xl sm:p-20">
          <div className="hero-grid absolute inset-0 opacity-40 mix-blend-overlay" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-400/30 blur-[60px]" />
          
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold sm:text-5xl tracking-tight">Ready for a hassle-free service?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-100/90 leading-relaxed">Join thousands of happy car owners. Create an account in under a minute and experience premium automotive care.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn bg-white !px-8 !py-4 text-lg text-brand-700 hover:scale-105 shadow-xl shadow-brand-900/20">
                Create free account <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-line bg-surface py-12 text-center">
        <div className="mx-auto max-w-7xl px-4 flex flex-col items-center">
          <Logo className="mb-6 scale-110" />
          <div className="flex gap-6 mb-8 text-sm font-medium text-muted">
            <Link to="/help" className="hover:text-brand-600 transition-colors">Help &amp; FAQ</Link>
            <Link to="/register" className="hover:text-brand-600 transition-colors">Sign Up</Link>
            <Link to="/login" className="hover:text-brand-600 transition-colors">Log In</Link>
          </div>
          <p className="text-sm text-muted/80">© {new Date().getFullYear()} VSCMS Auto Care. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
