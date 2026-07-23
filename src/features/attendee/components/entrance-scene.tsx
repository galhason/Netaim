'use client';

import { motion } from 'motion/react';
import QRCode from 'react-qr-code';
import {
  SceneHeader,
  VenueDetails,
  sceneItem,
  sceneSequence,
} from '@/features/experience';
import type { AttendeeEntrance } from '../types/attendee-experience';
import { ENTRANCE_QR_SIZE } from '../constants/qr';

interface EntranceSceneProps {
  entrance: AttendeeEntrance;
}

const EntranceScene = ({ entrance }: EntranceSceneProps) => (
  <section id="entrance" className="bg-surface text-text-primary">
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={sceneSequence}
      className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-6 py-24 text-center md:py-32"
    >
      <SceneHeader
        label={entrance.label}
        heading={entrance.heading}
        centered
      />
      {entrance.text ? (
        <motion.p
          variants={sceneItem}
          className="max-w-prose leading-relaxed text-text-secondary md:text-lg"
        >
          {entrance.text}
        </motion.p>
      ) : null}
      <motion.figure
        variants={sceneItem}
        className="flex flex-col items-center gap-4"
      >
        <div className="bg-surface-raised p-6">
          <QRCode value={entrance.qrValue} size={ENTRANCE_QR_SIZE} />
        </div>
        <figcaption className="text-xs tracking-wide text-text-secondary">
          {entrance.qrCaption}
        </figcaption>
      </motion.figure>
      <motion.p variants={sceneItem} className="flex flex-col gap-1">
        <span className="text-xs tracking-widest text-text-secondary">
          {entrance.statusLabel}
        </span>
        <span className="font-medium">{entrance.statusValue}</span>
      </motion.p>
      {entrance.details.length > 0 ? (
        <div className="w-full pt-4 text-start">
          <VenueDetails details={entrance.details} />
        </div>
      ) : null}
      {entrance.offlineNote ? (
        <motion.p
          variants={sceneItem}
          className="text-xs tracking-wide text-text-secondary"
        >
          {entrance.offlineNote}
        </motion.p>
      ) : null}
    </motion.div>
  </section>
);

export default EntranceScene;
