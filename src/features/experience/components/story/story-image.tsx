'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import type { ImageMedia } from '../../types/scene-content';
import { sceneItem } from '../../utils/scene-motion';

const StoryImage = ({ image }: { image: ImageMedia }) => (
  <motion.div
    variants={sceneItem}
    className="relative -mx-6 aspect-[4/5] overflow-hidden md:mx-0 md:-me-12 md:aspect-[2/3]"
  >
    <Image
      src={image.url}
      alt={image.alt ?? ''}
      fill
      sizes="(min-width: 768px) 60vw, 100vw"
      className="object-cover"
    />
  </motion.div>
);

export default StoryImage;
