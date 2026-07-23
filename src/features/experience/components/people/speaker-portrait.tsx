'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { sceneItem } from '../../utils/scene-motion';

interface SpeakerPortraitProps {
  name: string;
  role?: string;
  photoUrl?: string;
  photoAlt?: string;
}

const SpeakerPortrait = ({
  name,
  role,
  photoUrl,
  photoAlt,
}: SpeakerPortraitProps) => (
  <motion.figure
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.3 }}
    variants={sceneItem}
    className="flex flex-col gap-3"
  >
    {photoUrl ? (
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={photoUrl}
          alt={photoAlt ?? name}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover"
        />
      </div>
    ) : (
      <div aria-hidden="true" className="aspect-[3/4] bg-border/40" />
    )}
    <figcaption className="flex flex-col gap-0.5">
      <span className="font-display text-lg font-medium md:text-xl">
        {name}
      </span>
      {role ? <span className="text-sm text-text-secondary">{role}</span> : null}
    </figcaption>
  </motion.figure>
);

export default SpeakerPortrait;
