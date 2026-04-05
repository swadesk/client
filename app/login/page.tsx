"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LockKeyhole, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { api, type ApiError } from "@/lib/api";
import { useAuthHydration } from "@/lib/auth-hydration";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";
import { ForgotPasswordLink } from "@/components/auth/forgot-password-link";

const highlights = [
  { title: "All-in-one platform", desc: "QR menus, kitchen display & ordering in a single workspace" },
  { title: "Multi-outlet ready", desc: "Switch between outlets with isolated data and sync" },
  { title: "India-first", desc: "₹ pricing, GST support & local payment defaults" },
];

function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "message" in e;
}

/** Auth field — light grey bg, placeholder-centric, reference-style */
function AuthField({
  className,
  id,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      id={id}
      className={cn(
        "h-11 w-full min-h-[44px] rounded-lg border border-transparent bg-muted/80 px-4 text-sm leading-snug",
        "placeholder:text-muted-foreground placeholder:transition-colors",
        "transition-all duration-200 ease-out",
        "focus-visible:border-border focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-black/5 focus-visible:ring-offset-0",
        "dark:bg-white/[0.06] dark:focus-visible:bg-background/[0.08] dark:focus-visible:border-white/10",
        className,
      )}
      {...props}
    />
  );
}

function SignInField({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="group relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-foreground/70" />
      <AuthField className={cn("pl-11", className)} {...props} />
    </div>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  placeholder = "Password",
  autoComplete = "current-password",
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="group relative">
      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-foreground/70" />
      <AuthField
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="pl-11 pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-black/10 dark:hover:bg-white/10 dark:focus:ring-white/20"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function LoginLogo({ height = 42, className }: { height?: number; className?: string }) {
  return (
    <Image
      src="/branding/namasqr-logo.svg"
      alt="NamasQr"
      width={280}
      height={78}
      unoptimized
      priority
      className={cn("h-auto w-auto max-w-[min(100%,250px)] object-contain", className)}
      style={{ height, width: "auto" }}
    />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useAuthHydration();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const [panel, setPanel] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    if (accessToken && user) router.replace(getPostAuthRedirectPath(user));
  }, [hydrated, accessToken, user, router]);

  async function handleSignIn() {
    const em = email.trim();
    if (!em || !password) {
      toast.error("Enter email and password");
      return;
    }
    setBusy(true);
    try {
      const { token, user: u } = await api.auth.login({ email: em, password });
      setSession(token, u);
      toast.success("Signed in");
      router.replace(getPostAuthRedirectPath(u));
    } catch (e) {
      toast.error(isApiError(e) ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    const n = name.trim();
    const em = email.trim();
    if (!n || !em || password.length < 8) {
      toast.error("Enter name, email, and a password of at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const { token, user: u } = await api.auth.register({ name: n, email: em, password });
      setSession(token, u);
      toast.success("Account created");
      router.replace(getPostAuthRedirectPath(u));
    } catch (e) {
      toast.error(isApiError(e) ? e.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh w-full bg-background">
      <div className="grid min-h-dvh w-full min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
        <aside className="relative hidden min-h-dvh flex-col justify-between overflow-hidden bg-gradient-to-br from-[hsl(222_48%_12%)] via-[hsl(222_45%_10%)] to-[hsl(222_50%_8%)] px-10 py-12 sm:px-12 sm:py-14 lg:flex xl:px-20 xl:py-16">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 100% 80% at 0% 0%, hsl(24 95% 55% / 0.15), transparent 45%), radial-gradient(ellipse 60% 50% at 100% 100%, hsl(222 50% 30% / 0.4), transparent 50%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
          <div className="relative z-10 flex flex-col">
            <div className="inline-flex w-fit rounded-2xl bg-white p-4 shadow-2xl shadow-black/25 ring-1 ring-white/30">
              <LoginLogo height={48} className="max-w-[220px]" />
            </div>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.38em] text-[hsl(24_95%_65%)]">
              Tradition meets technology
            </p>
            <h1 className="mt-6 max-w-md text-[1.75rem] font-semibold leading-[1.25] tracking-tight text-white xl:text-[2rem] xl:leading-snug">
              One workspace for your floor, kitchen, and QR guests.
            </h1>
            <ul className="mt-12 space-y-6">
              {highlights.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <CheckCircle2 className="size-5 text-[hsl(24_95%_60%)]" aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-white/95">{item.title}</p>
                    <p className="mt-0.5 text-[0.9rem] leading-relaxed text-white/70">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative z-10 text-[11px] text-white/40 tracking-wide">
            © {new Date().getFullYear()} NamasQr. All rights reserved.
          </p>
        </aside>

        <section className="relative min-h-dvh w-full min-w-0 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[hsl(210_30%_98%)] to-[hsl(40_25%_97%)] dark:from-[hsl(222_44%_7%)] dark:to-[hsl(222_44%_6%)] lg:border-l lg:border-black/[0.04] dark:lg:border-white/[0.04]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 120% 80% at 100% 0%, hsl(210 70% 97% / 0.5), transparent 50%), radial-gradient(ellipse 80% 60% at 0% 100%, hsl(220 40% 96% / 0.3), transparent 45%)",
            }}
          />

          <div className="relative z-10 flex min-h-dvh flex-col justify-center px-4 py-6 sm:py-10 sm:px-6 lg:py-12 lg:px-8">
            <div className="mx-auto w-full max-w-[400px]">
              <div className="mb-5 flex flex-col items-center lg:hidden">
                <div className="rounded-xl bg-white p-3 shadow-md">
                  <LoginLogo height={36} className="max-w-[180px]" />
                </div>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Tradition meets technology
                </p>
              </div>

              <div className="w-full">
                <div
                  className={cn(
                    "rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_-4px_rgba(0,0,0,0.06)]",
                    "dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]",
                    "sm:p-7",
                  )}
                >
                  {panel === "signup" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPanel("signin")}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      >
                        <ArrowLeft className="size-4" />
                        Back to sign in
                      </button>
                      <div className="flex flex-col items-center text-center">
                        <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-muted/80 dark:bg-white/10">
                          <LogIn className="size-5 text-foreground/80" aria-hidden />
                        </div>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                          Create your account
                        </h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          Password must be at least 8 characters
                        </p>
                      </div>
                      <div className="mt-6 space-y-3">
                        <AuthField
                          id="signup-name"
                          autoComplete="name"
                          placeholder="Full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                        <AuthField
                          id="signup-email"
                          type="email"
                          autoComplete="email"
                          placeholder="Work email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <PasswordField
                          id="signup-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          autoComplete="new-password"
                        />
                        <Button
                          className="h-11 w-full rounded-xl bg-[#111827] text-sm font-semibold text-white transition-colors hover:bg-[#1f2937] disabled:opacity-60"
                          type="button"
                          disabled={busy}
                          onClick={() => void handleSignUp()}
                        >
                          {busy ? "Creating account…" : "Get started"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col items-center text-center">
                        <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-muted/80 dark:bg-white/10">
                          <LogIn className="size-5 text-foreground/80" aria-hidden />
                        </div>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                          Sign in with email
                        </h2>
                        <p className="mt-1.5 text-center text-sm text-muted-foreground">
                          Access your NamasQr workspace
                        </p>
                      </div>

                      <div className="mt-6 space-y-3">
                        <SignInField
                          icon={Mail}
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <div className="space-y-2">
                          <PasswordField
                            id="login-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                          />
                          <div className="flex justify-end">
                            <ForgotPasswordLink />
                          </div>
                        </div>
                        <Button
                          className="h-11 w-full rounded-xl bg-[#111827] text-sm font-semibold text-white transition-colors hover:bg-[#1f2937] disabled:opacity-60"
                          type="button"
                          disabled={busy}
                          onClick={() => void handleSignIn()}
                        >
                          {busy ? "Signing in…" : "Get started"}
                        </Button>
                      </div>

                      <p className="mt-5 text-center text-sm text-muted-foreground">
                        New to NamasQr?{" "}
                        <button
                          type="button"
                          onClick={() => setPanel("signup")}
                          className="font-semibold text-foreground underline-offset-4 transition-colors hover:underline"
                        >
                          Create an account
                        </button>
                      </p>
                    </>
                  )}
                </div>

                <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
                  <span className="font-semibold text-foreground">NamasQr</span> — QR ordering &amp; kitchen ops for Indian
                  restaurants.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
