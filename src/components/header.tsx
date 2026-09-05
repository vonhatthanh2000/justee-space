"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  ["Home", "/"],
  ["Blog", "/blog"],
  ["Coding", "/coding"],
  ["Creative", "/creative"],
  ["Pastimes", "/pastimes"],
] as const;

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <header className="site-header">
      <Link
        className="brand"
        href="/"
        aria-label="Justee Vo, home"
        onClick={() => setOpen(false)}
      >
        <span className="brand-mark" aria-hidden="true">
          <Image src="/images/favicon.webp" alt="" width={64} height={64} priority />
        </span>
      </Link>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {links.map(([label, href]) => (
          <Link className={isActive(href) ? "active" : ""} href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>

      <button
        className="menu-button"
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? "Close navigation" : "Open navigation"}
        onClick={() => setOpen((current) => !current)}
      >
        <span />
        <span />
      </button>

      <nav
        id="mobile-navigation"
        className={`mobile-nav ${open ? "open" : ""}`}
        aria-label="Mobile navigation"
      >
        {links.map(([label, href]) => (
          <Link className={isActive(href) ? "active" : ""} href={href} key={href} onClick={() => setOpen(false)}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
