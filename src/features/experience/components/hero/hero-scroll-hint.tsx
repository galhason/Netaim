import { Mouse } from 'lucide-react';
import { Icon } from '@/shared';

interface HeroScrollHintProps {
  label?: string;
}

const HeroScrollHint = ({ label }: HeroScrollHintProps) => (
  <div
    aria-hidden="true"
    className="absolute bottom-28 start-1/2 flex -translate-x-1/2 flex-col items-center gap-2 opacity-70 rtl:translate-x-1/2"
  >
    <span className="animate-[hero-hint-pulse_3.2s_ease-in-out_infinite]">
      <Icon icon={Mouse} size="md" />
    </span>
    {label ? <span className="text-xs font-medium">{label}</span> : null}
  </div>
);

export default HeroScrollHint;
