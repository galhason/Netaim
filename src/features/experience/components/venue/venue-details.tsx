'use client';

import { motion } from 'motion/react';
import { sceneItem, sceneSequence } from '../../utils/scene-motion';

interface VenueDetail {
  id: string;
  label: string;
  value: string;
}

interface VenueDetailsProps {
  details: VenueDetail[];
}

const VenueDetails = ({ details }: VenueDetailsProps) => (
  <motion.dl
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.4 }}
    variants={sceneSequence}
    className="grid grid-cols-2 gap-x-10 gap-y-8 md:grid-cols-4"
  >
    {details.map((detail) => (
      <motion.div
        key={detail.id}
        variants={sceneItem}
        className="flex flex-col gap-1"
      >
        <dt className="text-xs tracking-widest text-text-secondary">
          {detail.label}
        </dt>
        <dd className="font-medium">{detail.value}</dd>
      </motion.div>
    ))}
  </motion.dl>
);

export default VenueDetails;
