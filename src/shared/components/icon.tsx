import type { LucideIcon } from 'lucide-react';

const ICON_SIZES = {
  sm: 16,
  md: 20,
} as const;

type IconSize = keyof typeof ICON_SIZES;

interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
}

/*
 * The single entry point for icons: the library never leaks past this
 * primitive, so it stays swappable (Component-Architecture section 9.4).
 */
export const Icon = ({ icon: Glyph, size = 'sm' }: IconProps) => (
  <Glyph size={ICON_SIZES[size]} strokeWidth={1.5} aria-hidden="true" />
);
