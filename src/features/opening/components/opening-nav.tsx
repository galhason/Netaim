'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Locale } from '@/config/locales';
import { NAV_LINKS, OPENING_UI } from '../constants/opening-content';

/*
 * The platform navigation: present from the first frame but quiet — a
 * letterbox scrim, the brand, three anchors and the language. It gains
 * nothing on scroll except staying legible.
 */
interface OpeningNavProps {
  locale: Locale;
  brand: string;
  meHref?: string | null;
}

const OpeningNav = ({ locale, brand, meHref }: OpeningNavProps) => {
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();
  const other: Locale = locale === 'he' ? 'en' : 'he';

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: reduce ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`cine-nav-scrim fixed inset-x-0 top-0 z-50 transition-all duration-1000 focus-within:opacity-100 ${
        scrolled ? 'opacity-100' : 'opacity-15'
      }`}
    >
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-12">
        <Link
          href={`/${locale}`}
          className="font-display text-lg font-medium tracking-[0.32em] text-text-primary"
        >
          {brand}
        </Link>
        <div className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="text-sm tracking-wide text-text-secondary transition-colors delay-75 hover:text-text-primary"
            >
              {link.label[locale]}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-6">
          {meHref ? (
            <Link
              href={meHref}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {OPENING_UI.myArea[locale]}
            </Link>
          ) : null}
          <Link
            href={`/${other}`}
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            {other === 'he' ? 'עברית' : 'EN'}
          </Link>
        </div>
      </nav>
    </motion.header>
  );
};

export default OpeningNav;
