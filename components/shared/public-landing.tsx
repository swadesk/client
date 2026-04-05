import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ChefHat,
  Clock3,
  Globe2,
  Layers3,
  MessageSquareQuote,
  QrCode,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import { BrandLogo } from "@/components/branding/brand-logo";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { LandingAuthCta } from "./landing-auth-cta";
import { ProductScreensShowcase } from "./product-screens-showcase";
import { ContactSalesForm } from "./contact-sales-form";

type LandingButtonVariant = "default" | "outline";
type LandingButtonSize = "sm" | "lg";

function landingButtonClassName({
  variant = "default",
  size = "sm",
}: {
  variant?: LandingButtonVariant;
  size?: LandingButtonSize;
}) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
    size === "lg" ? "h-11 px-5" : "h-9 px-3.5",
    variant === "outline"
      ? "border border-border bg-background text-foreground hover:bg-muted"
      : "border border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
  );
}

const capabilityCards = [
  {
    title: "QR Ordering That Feels Instant",
    description:
      "Enable table-side ordering with a smooth menu flow that reduces wait time and keeps orders moving.",
    icon: QrCode,
  },
  {
    title: "Kitchen Workflow In Sync",
    description:
      "Route orders to stations, prioritize prep, and keep service teams aligned in real time.",
    icon: ChefHat,
  },
  {
    title: "Multi-Outlet Control",
    description:
      "Run menus, pricing, and daily operations across all outlets from one command center.",
    icon: Store,
  },
  {
    title: "Actionable Analytics",
    description:
      "Track sales, order trends, and item performance to improve margins and staffing decisions.",
    icon: BarChart3,
  },
  {
    title: "Permissions And Compliance",
    description:
      "Set staff-level access with confidence and keep critical workflows secure and auditable.",
    icon: ShieldCheck,
  },
  {
    title: "Always-On Team Coordination",
    description:
      "Standardize day-to-day operating tasks and reduce friction between floor, kitchen, and managers.",
    icon: Layers3,
  },
];

const trustStats = [
  { value: "99.95%", label: "Uptime for critical operations" },
  { value: "35%", label: "Faster average table turnaround" },
  { value: "2.3x", label: "Increase in digital ordering share" },
  { value: "24/7", label: "Support for live restaurant hours" },
];

const outcomeCards = [
  {
    title: "Boost Peak-Hour Throughput",
    description:
      "Accelerate order capture and kitchen dispatch to serve more guests without adding chaos.",
    icon: TrendingUp,
  },
  {
    title: "Reduce Operational Delays",
    description:
      "From order-taking to billing, remove manual handoffs that slow down staff and guests.",
    icon: Clock3,
  },
  {
    title: "Scale With Consistency",
    description:
      "Standardize service quality and reporting across growing outlet networks and teams.",
    icon: Globe2,
  },
];

const testimonials = [
  {
    quote:
      "NamasQr helped us bring floor operations, kitchen flow, and billing into one simple process. Our staff adapted quickly and service speed improved in week one.",
    name: "Rohan Mehta",
    role: "Operations Head, SpiceCourt Kitchens",
  },
  {
    quote:
      "The live visibility across outlets is a game changer. We can spot bottlenecks early and keep service quality consistent during rush hours.",
    name: "Ananya Kapoor",
    role: "Founder, UrbanTadka Group",
  },
  {
    quote:
      "Our managers spend less time coordinating tasks manually and more time improving guest experience. The system feels built for real restaurant teams.",
    name: "Kabir Sethi",
    role: "Director, Plate&Pour Hospitality",
  },
];

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" aria-label="NamasQr home">
          <BrandLogo height={34} />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link href="#features" className="hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#outcomes" className="hover:text-foreground transition-colors">
            Outcomes
          </Link>
          <Link href="#screens" className="hover:text-foreground transition-colors">
            Screens
          </Link>
          <Link href="#testimonials" className="hover:text-foreground transition-colors">
            Testimonials
          </Link>
          <Link href="#contact" className="hover:text-foreground transition-colors">
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LandingAuthCta
            outlineButtonClassName={landingButtonClassName({ variant: "outline", size: "sm" })}
            primaryButtonClassName={landingButtonClassName({ size: "sm" })}
          />
        </div>
      </div>
    </header>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--brand-orange)/0.22),transparent_35%),radial-gradient(circle_at_80%_0%,hsl(var(--brand-navy)/0.2),transparent_42%)]" />
      <div className="pointer-events-none absolute -left-40 top-20 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-64 w-64 rounded-full bg-[hsl(var(--brand-navy)/0.2)] blur-3xl" />
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
        <div>
          <Badge variant="secondary" className="mb-5">
            Built for modern Indian hospitality teams
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Run smarter restaurant operations with NamasQr
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Bring ordering, kitchen coordination, billing, and outlet-level visibility into one
            streamlined platform designed for high-volume service teams.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login" className={landingButtonClassName({ size: "lg" })}>
              Get started
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#contact"
              className={landingButtonClassName({ variant: "outline", size: "lg" })}
            >
              Book a demo
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Easy team onboarding
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Secure role-based access
            </span>
          </div>
        </div>
        <Card className="border-border/70 bg-card/85 shadow-2xl shadow-primary/5">
          <CardHeader>
            <CardTitle>Live operations snapshot</CardTitle>
            <CardDescription>
              A single view of service health, outlet performance, and task progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-5">
            <div className="rounded-lg border border-border/70 bg-background/80 p-3">
              <div className="mb-2 text-xs text-muted-foreground">Current service status</div>
              <div className="flex items-center justify-between text-sm">
                <span>Orders in progress</span>
                <span className="font-medium text-foreground">42</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span>Avg prep time</span>
                <span className="font-medium text-foreground">13 min</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background/80 p-3">
                <div className="text-xs text-muted-foreground">Today revenue</div>
                <div className="mt-1 text-lg font-semibold">Rs 1.84L</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/80 p-3">
                <div className="text-xs text-muted-foreground">Table turnover</div>
                <div className="mt-1 text-lg font-semibold">+29%</div>
              </div>
            </div>
            <div className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary-foreground">
              <p className="text-primary">
                Weekly insight: peak dinner demand shifted by 35 minutes in your downtown outlet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything your service team needs, from table to takeaway
        </h2>
        <p className="mt-3 text-muted-foreground sm:text-base">
          NamasQr unifies the workflows that matter most so managers, chefs, and floor staff can
          focus on speed and guest experience.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {capabilityCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.title}
              className="border-border/70 bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardHeader>
                <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function MetricsBand() {
  return (
    <section className="border-y border-border/60 bg-muted/45">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {trustStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-background/60 p-4">
            <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function UseCasesSection() {
  return (
    <section id="outcomes" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Built to improve revenue, reliability, and repeatability
        </h2>
        <p className="mt-3 text-muted-foreground">
          Whether you run one flagship outlet or a growing chain, NamasQr helps teams execute with
          confidence every day.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {outcomeCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.title}
              className="border-border/70 bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardHeader>
                <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Trusted by teams that serve thousands of guests
        </h2>
        <p className="mt-3 text-muted-foreground">
          Restaurant operators rely on NamasQr to reduce friction and scale service quality.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {testimonials.map((item) => (
          <Card
            key={item.name}
            className="border-border/70 bg-card/85 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
          >
            <CardHeader>
              <MessageSquareQuote className="mb-1 size-5 text-primary" />
              <CardDescription className="text-sm leading-relaxed text-foreground">
                &quot;{item.quote}&quot;
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-5">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.role}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Questions teams ask before switching
        </h2>
        <p className="mt-3 text-muted-foreground">
          Quick answers for operators evaluating a modern restaurant stack.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>How long does onboarding take?</CardTitle>
            <CardDescription>
              Most teams are up and running in under a week, including menu setup and staff
              onboarding.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Can we use this across multiple outlets?</CardTitle>
            <CardDescription>
              Yes. NamasQr supports centralized controls with outlet-level operational visibility.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Will this work for both dine-in and takeaway?</CardTitle>
            <CardDescription>
              Absolutely. You can manage mixed service models without fragmenting workflows.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Do managers get live performance insights?</CardTitle>
            <CardDescription>
              Yes. Sales, order flow, and key service metrics are available from one dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  );
}

export function FinalCtaFooter() {
  return (
    <section id="contact" className="relative overflow-hidden border-t border-border/60 bg-card">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--brand-orange)/0.12),transparent_34%)]" />
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="outline" className="mb-4">
            Contact sales
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Tell us your setup and we will design the right rollout plan
          </h2>
          <p className="mt-3 text-muted-foreground">
            Share your current stack, order volume, and timeline. Our team will schedule a guided
            walkthrough with recommended workflows and migration support.
          </p>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p>Sales hotline: +91 91043 69797</p>
            <p>Email: inquiry@namasqr.com</p>
            <p>Response SLA: within one business day</p>
          </div>
        </div>
        <div>
          <ContactSalesForm />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} NamasQr. Built for hospitality teams.</p>
            <div className="flex items-center gap-4">
              <Link href="/login" className="hover:text-foreground transition-colors">
                Sign in
              </Link>
              <Link href="mailto:support@namasqr.com" className="hover:text-foreground transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicLandingPage() {
  return (
    <main className="relative isolate bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--background))_60%,hsl(var(--muted)/0.35))]" />
      <LandingNavbar />
      <HeroSection />
      <FeatureGrid />
      <MetricsBand />
      <UseCasesSection />
      <ProductScreensShowcase />
      <TestimonialsSection />
      <FaqSection />
      <FinalCtaFooter />
    </main>
  );
}
