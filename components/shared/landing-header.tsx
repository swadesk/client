"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { BrandLogo } from "@/components/branding/brand-logo";
import { cn } from "@/lib/utils";

import { landingButtonClassName } from "./landing-button";
import { LandingAuthCta } from "./landing-auth-cta";
import { ThemeToggle } from "./theme-toggle";

const navLinks = [
  { href: "#workflow", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#outcomes", label: "Outcomes" },
  { href: "#screens", label: "Product" },
  { href: "#testimonials", label: "Customers" },
  { href: "#contact", label: "Contact" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const sections = navLinks
      .map((link) => document.getElementById(link.href.slice(1)))
      .filter((section): section is HTMLElement => Boolean(section));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="NamasQr home" className="shrink-0" onClick={close}>
          <BrandLogo compact height={32} />
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                active === link.href.slice(1) ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden lg:block">
            <LandingAuthCta
              outlineButtonClassName={landingButtonClassName({ variant: "outline" })}
              primaryButtonClassName={landingButtonClassName()}
            />
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground lg:hidden"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="landing-menu" className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col px-3 py-3 sm:px-6" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted",
                  active === link.href.slice(1) ? "bg-muted text-foreground" : "text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-2 border-t border-border px-3 pt-3 lg:hidden">
              <Link
                href="/login"
                onClick={close}
                className={cn(landingButtonClassName({ variant: "outline" }), "w-full")}
              >
                Sign in
              </Link>
              <Link href="#contact" onClick={close} className={cn(landingButtonClassName(), "w-full")}>
                Book a demo
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
