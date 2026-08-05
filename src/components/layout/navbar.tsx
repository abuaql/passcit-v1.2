"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { TestVersionSwitcher, type TestVersionOption } from "./test-version-switcher";
import { clearServiceWorkerCache } from "@/components/pwa/clear-service-worker-cache";
import { desktopNavLinks } from "@/lib/nav-links";
import { strings } from "@/lib/i18n";

export function Navbar({
  testVersions,
  activeTestVersionId,
}: {
  testVersions?: TestVersionOption[];
  activeTestVersionId?: string;
} = {}) {
  const { status } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-heading text-xl font-bold text-primary"
        >
          <GraduationCap className="h-6 w-6 shrink-0" aria-hidden="true" />
          {/* The wordmark is hidden on the narrowest screens so the header
              row fits without overflowing: at 320px the logo, test-version
              switcher, theme toggle and Log out button together need more
              width than is available. The icon still marks the brand and
              still links home, so nothing is lost functionally — and the
              accessible name below keeps the link labelled for screen
              readers at every width. */}
          <span className="hidden sm:inline">Passcit</span>
          <span className="sr-only sm:hidden">Passcit</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {testVersions && activeTestVersionId && (
            <TestVersionSwitcher versions={testVersions} activeId={activeTestVersionId} />
          )}
          <ThemeToggle />

          {status === "authenticated" ? (
            <>
              <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
                {desktopNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                    className="px-2 py-1 text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearServiceWorkerCache();
                  signOut({ callbackUrl: "/" });
                }}
              >
                {strings.nav.logOut}
              </Button>
            </>
          ) : status === "unauthenticated" ? (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {strings.nav.logIn}
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">{strings.nav.signUp}</Button>
              </Link>
            </>
          ) : (
            <div className="h-9 w-20" />
          )}
        </div>
      </div>
    </header>
  );
}
