import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ChefHat,
  Clock3,
  Globe2,
  Layers3,
  Mail,
  Phone,
  QrCode,
  ShieldCheck,
  Store,
} from "lucide-react";

import { BrandLogo } from "@/components/branding/brand-logo";
import { cn } from "@/lib/utils";

import { ContactSalesForm } from "./contact-sales-form";
import { landingButtonClassName } from "./landing-button";
import { LandingDemo } from "./landing-demo";
import { LandingFaq } from "./landing-faq";
import { LandingHeader } from "./landing-header";
import { serviceStory, storyItems } from "./landing-story";
import { LandingWhatsAppButton } from "./landing-whatsapp";
import { LandingWorkflow } from "./landing-workflow";
import { ProductScreensShowcase } from "./product-screens-showcase";

const capabilityCards = [
  {
    title: "QR ordering",
    description: "Guests scan the QR and order from their phone. No app to install.",
    icon: QrCode,
    featured: true,
  },
  {
    title: "Kitchen tickets",
    description: "The order shows up on the kitchen screen with the table number, ready to cook.",
    icon: ChefHat,
    featured: true,
  },
  {
    title: "Every outlet",
    description: "Menus and prices for each restaurant, from one place.",
    icon: Store,
  },
  {
    title: "Tonight’s numbers",
    description: "Sales, busy hours, and the dishes people actually ordered.",
    icon: BarChart3,
  },
  {
    title: "Who can do what",
    description: "Staff only see the screens their job needs.",
    icon: ShieldCheck,
  },
  {
    title: "One shared picture",
    description: "Floor, kitchen, and manager follow the same order. No side chats.",
    icon: Layers3,
  },
];

const trustStats = [
  { value: "99.95%", label: "Uptime for critical operations" },
  { value: "35%", label: "Faster average table turnaround" },
  { value: "2.3×", label: "Increase in digital ordering share" },
  { value: "24/7", label: "Support through live service hours" },
];

const outcomeCards = [
  {
    title: "More guests through the same room",
    description: "Orders reach the kitchen immediately, so tables turn without the floor getting louder.",
    icon: BarChart3,
  },
  {
    title: "Fewer “where is my order?” moments",
    description: "The table, the kitchen, and the bill are looking at the same order.",
    icon: Clock3,
  },
  {
    title: "Every outlet runs it the same way",
    description: "A second location gets the same menu, the same tickets, and the same reports.",
    icon: Globe2,
  },
];

const testimonials = [
  {
    quote:
      "NamasQr brought floor operations, kitchen flow, and billing into one process. The team adapted quickly, and service speed improved in the first week.",
    name: "Rohan Mehta",
    role: "Operations Head, SpiceCourt Kitchens",
  },
  {
    quote:
      "Live visibility across outlets lets us catch bottlenecks early and keep service quality steady through the rush.",
    name: "Ananya Kapoor",
    role: "Founder, UrbanTadka Group",
  },
  {
    quote:
      "Managers spend less time chasing updates and more time on the guest. It feels built for a real service team.",
    name: "Kabir Sethi",
    role: "Director, Plate&Pour Hospitality",
  },
];

const previewMenu = [...storyItems, { name: "Filter coffee", price: "₹90" }];

function QuoteMark({ name }: { name: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {name
        .split(" ")
        .map((part) => part[0])
        .join("")}
    </span>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

const stations = [
  { name: "Grill", load: "78%", width: "w-[78%]" },
  { name: "Tandoor", load: "54%", width: "w-[54%]" },
  { name: "Pass", load: "32%", width: "w-[32%]" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-x-clip border-b border-border">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.55)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.55)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute right-0 top-8 -z-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute left-1/3 top-24 -z-10 h-56 w-56 rounded-full bg-[hsl(222_47%_40%/0.12)] blur-3xl" aria-hidden />
      <div className="mx-auto grid w-full min-w-0 max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-20 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-16">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Built for restaurant teams
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.15rem] lg:leading-[1.08]">
            Guests scan the QR. Your team already has the order.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            No app to download. The kitchen, the floor, and the bill all see the same order.
          </p>
          <ol className="mt-6 flex flex-wrap items-center gap-1.5">
            {serviceStory.map((beat, index) => (
              <li key={beat.id} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <span className="text-xs text-muted-foreground/50" aria-hidden>
                    —
                  </span>
                ) : null}
                <Link
                  href="#workflow"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-sm transition-colors hover:border-primary/40"
                >
                  <span className="text-[11px] font-semibold tabular-nums text-primary">{index + 1}</span>
                  <span className="font-medium">{beat.short}</span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="#contact" className={landingButtonClassName({ size: "lg" })}>
              Book a demo
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className={landingButtonClassName({ variant: "outline", size: "lg" })}>
              Sign in
            </Link>
          </div>
          <ul className="mt-8 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            <li className="inline-flex items-center gap-2">
              <QrCode className="size-4 text-primary" aria-hidden />
              Guests scan the QR
            </li>
            <li className="inline-flex items-center gap-2">
              <ChefHat className="size-4 text-primary" aria-hidden />
              Kitchen sees it live
            </li>
            <li className="inline-flex items-center gap-2">
              <Store className="size-4 text-primary" aria-hidden />
              One outlet or many
            </li>
          </ul>
        </div>
        <LandingDemo />
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return <LandingWorkflow />;
}

export function FeatureGrid() {
  const featured = capabilityCards.filter((item) => item.featured);
  const rest = capabilityCards.filter((item) => !item.featured);

  return (
    <section id="features" className="border-t border-border bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionIntro
          eyebrow="Platform"
          title="The screens behind that story."
          description="After the guest orders, this is what the kitchen, the floor, and the manager actually open."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {featured.map((item) => {
            const Icon = item.icon;
            const isKitchen = item.title === "Kitchen tickets";
            return (
              <article key={item.title} className="rounded-2xl border border-border bg-card p-6 sm:p-7">
                <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-primary">
                  <Icon className="size-4" aria-hidden />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                {isKitchen ? (
                  <ul className="mt-6 space-y-2">
                    {stations.map((station) => (
                      <li key={station.name} className="rounded-lg border border-border bg-background px-3 py-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{station.name}</span>
                          <span className="text-xs text-muted-foreground">{station.load}</span>
                        </div>
                        <div className="mt-2 h-1 rounded-full bg-muted">
                          <div className={cn("landing-motion h-1 origin-left rounded-full bg-primary motion-safe:animate-[landing-grow_0.8s_ease_both]", station.width)} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                    {previewMenu.map((menuItem) => (
                      <li key={menuItem.name} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <span>{menuItem.name}</span>
                        <span className="font-medium tabular-nums">{menuItem.price}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rest.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="min-w-0 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <Icon className="size-4 text-primary" aria-hidden />
                <h3 className="mt-4 text-sm font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function MetricsBand() {
  return (
    <section aria-label="Operating results" className="bg-[hsl(222_47%_11%)] text-[hsl(40_25%_96%)]">
      <dl className="mx-auto grid w-full max-w-6xl sm:grid-cols-2 lg:grid-cols-4">
        {trustStats.map((stat) => (
          <div key={stat.label} className="min-w-0 border-t border-white/10 px-6 py-8 first:border-t-0 sm:border-t-0 sm:px-8 sm:[&:nth-child(n+3)]:border-t lg:border-l lg:[&:nth-child(n+3)]:border-t-0 lg:first:border-l-0">
            <dd className="text-4xl font-semibold tracking-tight">{stat.value}</dd>
            <dt className="mt-2 max-w-[14rem] text-sm text-white/65">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function UseCasesSection() {
  return (
    <section id="outcomes" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionIntro
          eyebrow="Outcomes"
          title="What changes on a busy night."
          description="One dining room or a growing group. The way a table moves stays the same."
        />
        <ol className="divide-y divide-border border-y border-border">
          {outcomeCards.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="grid gap-4 py-6 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-5">
                <div className="flex items-center gap-3 sm:block">
                  <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                  <Icon className="size-4 text-primary sm:mt-3" aria-hidden />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="border-t border-border bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionIntro
          eyebrow="Customers"
          title="Operators who run real rooms, not demo data."
          description="Teams use NamasQr to shorten the distance between the table, the pass, and the bill."
        />
        <div className="mt-12 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
          <figure className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-6 sm:p-8">
            <blockquote className="text-lg leading-relaxed text-foreground sm:text-xl">
              “{testimonials[0].quote}”
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-3 border-t border-border pt-5">
              <QuoteMark name={testimonials[0].name} />
              <span>
                <span className="block text-sm font-medium">{testimonials[0].name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{testimonials[0].role}</span>
              </span>
            </figcaption>
          </figure>
          <div className="grid gap-4">
            {testimonials.slice(1).map((item) => (
              <figure key={item.name} className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                <blockquote className="text-sm leading-relaxed text-foreground">“{item.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                  <QuoteMark name={item.name} />
                  <span>
                    <span className="block text-sm font-medium">{item.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{item.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <SectionIntro
        eyebrow="Questions"
        title="What teams ask before they switch."
        description="Practical answers for operators comparing a modern restaurant stack."
      />
      <LandingFaq />
    </section>
  );
}

export function FinalCtaFooter() {
  return (
    <>
      <section id="contact" className="border-t border-border bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-4 py-20 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-24">
          <div className="rounded-3xl bg-[hsl(222_47%_12%)] p-7 text-[hsl(40_25%_96%)] sm:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Contact</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
              Tell us about your restaurant.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Outlets, how busy you get, and when you want to start. We’ll show you how a table would run.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              <li>
                <a href="tel:+919104369797" className="inline-flex items-center gap-3 hover:text-primary">
                  <Phone className="size-4 text-primary" aria-hidden />
                  +91 91043 69797
                </a>
              </li>
              <li>
                <a href="mailto:inquiry@namasqr.com" className="inline-flex items-center gap-3 hover:text-primary">
                  <Mail className="size-4 text-primary" aria-hidden />
                  inquiry@namasqr.com
                </a>
              </li>
              <li className="inline-flex items-center gap-3 text-white/70">
                <Clock3 className="size-4 text-primary" aria-hidden />
                Reply within one business day
              </li>
            </ul>
          </div>
          <ContactSalesForm />
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div>
            <BrandLogo compact height={30} />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              QR ordering and restaurant operations for hospitality teams.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Product</p>
              <Link href="#features" className="block text-foreground hover:text-primary">
                Features
              </Link>
              <Link href="#workflow" className="block text-foreground hover:text-primary">
                How it works
              </Link>
              <Link href="#screens" className="block text-foreground hover:text-primary">
                Product
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Company</p>
              <Link href="#testimonials" className="block text-foreground hover:text-primary">
                Customers
              </Link>
              <Link href="#contact" className="block text-foreground hover:text-primary">
                Contact
              </Link>
              <Link href="/login" className="block text-foreground hover:text-primary">
                Sign in
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Support</p>
              <a href="mailto:support@namasqr.com" className="block text-foreground hover:text-primary">
                support@namasqr.com
              </a>
              <a href="tel:+919104369797" className="block text-foreground hover:text-primary">
                +91 91043 69797
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
            © {new Date().getFullYear()} NamasQr. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

export function PublicLandingPage() {
  return (
    <main data-landing className="overflow-x-clip bg-background text-foreground">
      <LandingHeader />
      <HeroSection />
      <WorkflowSection />
      <FeatureGrid />
      <MetricsBand />
      <UseCasesSection />
      <ProductScreensShowcase />
      <TestimonialsSection />
      <FaqSection />
      <FinalCtaFooter />
      <LandingWhatsAppButton />
    </main>
  );
}
