import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const screens = [
  {
    title: "Live Service Command Center",
    subtitle: "Track orders, prep load, and table turnover in real time.",
    metrics: [
      { label: "Orders in queue", value: "42" },
      { label: "Avg prep time", value: "13 min" },
      { label: "Table turnover", value: "+29%" },
    ],
    accent: "from-primary/30 to-primary/5",
  },
  {
    title: "Kitchen Flow Board",
    subtitle: "Move tickets by stage with station-level visibility.",
    metrics: [
      { label: "Ready in <15 min", value: "78%" },
      { label: "Missed SLA", value: "2%" },
      { label: "Peak load", value: "7:45 PM" },
    ],
    accent: "from-emerald-500/25 to-emerald-500/5",
  },
  {
    title: "Menu And Revenue Insights",
    subtitle: "See top performers and low-margin items instantly.",
    metrics: [
      { label: "Top item growth", value: "+41%" },
      { label: "Low-margin SKUs", value: "6" },
      { label: "AOV trend", value: "+18%" },
    ],
    accent: "from-indigo-500/25 to-indigo-500/5",
  },
];

export function ProductScreensShowcase() {
  const [featured, ...secondary] = screens;

  return (
    <section id="screens" className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-10 top-6 -z-10 h-44 rounded-full bg-primary/10 blur-3xl" />
      <div className="mb-8 max-w-3xl">
        <Badge variant="secondary" className="mb-4">
          Product experience
        </Badge>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          See the screens your team will use every shift
        </h2>
        <p className="mt-3 text-muted-foreground">
          From floor managers to kitchen ops, every screen is designed for fast decisions during
          service hours.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden border-border/70 bg-card/90 shadow-2xl shadow-primary/10">
          <CardHeader>
            <div className="mb-2 inline-flex w-fit items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
              Screen preview
            </div>
            <CardTitle>{featured.title}</CardTitle>
            <CardDescription>{featured.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="rounded-xl border border-border/70 bg-background/75 p-4">
              <div className={`rounded-xl border border-border/60 bg-gradient-to-br ${featured.accent} p-4`}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Ops HQ Dashboard</p>
                    <p className="text-xs text-muted-foreground">Updated 2 minutes ago</p>
                  </div>
                  <Badge variant="outline">Live</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-[0.65fr_0.35fr]">
                  <div className="rounded-lg border border-border/60 bg-card/90 p-3">
                    <p className="mb-2 text-xs text-muted-foreground">Today throughput trend</p>
                    <div className="flex h-24 items-end gap-2">
                      <div className="h-9 w-5 rounded bg-primary/30" />
                      <div className="h-14 w-5 rounded bg-primary/40" />
                      <div className="h-11 w-5 rounded bg-primary/35" />
                      <div className="h-20 w-5 rounded bg-primary/60" />
                      <div className="h-16 w-5 rounded bg-primary/50" />
                      <div className="h-[5.5rem] w-5 rounded bg-primary/70" />
                      <div className="h-[4.5rem] w-5 rounded bg-primary/55" />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/90 p-3">
                    <p className="mb-2 text-xs text-muted-foreground">Service mix</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span>Dine-in</span>
                        <span className="font-medium">61%</span>
                      </div>
                      <div className="h-1.5 rounded bg-primary/20">
                        <div className="h-1.5 w-[61%] rounded bg-primary" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Takeaway</span>
                        <span className="font-medium">27%</span>
                      </div>
                      <div className="h-1.5 rounded bg-primary/20">
                        <div className="h-1.5 w-[27%] rounded bg-primary/80" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Delivery</span>
                        <span className="font-medium">12%</span>
                      </div>
                      <div className="h-1.5 rounded bg-primary/20">
                        <div className="h-1.5 w-[12%] rounded bg-primary/65" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {featured.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-md border border-border/60 bg-card/90 p-3">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {secondary.map((screen) => (
            <Card
              key={screen.title}
              className="overflow-hidden border-border/70 bg-card/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
            >
              <CardHeader>
                <CardTitle>{screen.title}</CardTitle>
                <CardDescription>{screen.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="pb-5">
                <div className={`rounded-lg border border-border/60 bg-gradient-to-br ${screen.accent} p-3`}>
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Screen module</span>
                    <span>Realtime</span>
                  </div>
                  <div className="grid gap-2">
                    {screen.metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="flex items-center justify-between rounded-md border border-border/50 bg-card/90 px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">{metric.label}</span>
                        <span className="font-medium">{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
