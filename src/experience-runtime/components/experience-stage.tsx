import type { Locale } from '@/config/locales';
import { GuidingLight } from '@/shared';
import { resolveScene } from '../registry/scene-registry';
import type { ExperienceDescriptor } from '../types/experience';
import type { RuntimeMode, ScenePlacement } from '../types/scene';
import { ExperienceRuntime } from './experience-runtime';

/*
 * The stage every public experience plays on (Constitution v2 §1, §12):
 * the environment — Guiding Light toned by the DNA, the optional dust
 * texture — and the three placements of the one Runtime: overlays above
 * the journey, the flow inside it, the closing after it. The stage
 * knows no experience type and no scene; it only reads the descriptor
 * and asks the Registry where each scene lives.
 */
const NOSCRIPT_REVEAL =
  '.cine-reveal{opacity:1 !important;transform:none !important}';

const byPlacement = (
  experience: ExperienceDescriptor,
  placement: ScenePlacement,
): ExperienceDescriptor => ({
  ...experience,
  scenes: experience.scenes.filter(
    (scene) => (resolveScene(scene.type)?.placement ?? 'flow') === placement,
  ),
});

interface ExperienceStageProps {
  experience: ExperienceDescriptor;
  mode?: RuntimeMode;
  locale: Locale;
}

export const ExperienceStage = ({
  experience,
  mode = 'read',
  locale,
}: ExperienceStageProps) => (
  <div className="cinematic min-h-dvh bg-surface font-body text-text-primary">
    <GuidingLight tone={experience.dna.tone} />
    {experience.dna.texture === 'dust' ? (
      <div
        aria-hidden="true"
        className="cine-dust pointer-events-none fixed inset-0 z-[5] opacity-25"
      />
    ) : null}
    <noscript>
      <style>{NOSCRIPT_REVEAL}</style>
    </noscript>

    <ExperienceRuntime
      experience={byPlacement(experience, 'overlay')}
      mode={mode}
      locale={locale}
    />

    <main id="main-content">
      <ExperienceRuntime
        experience={byPlacement(experience, 'flow')}
        mode={mode}
        locale={locale}
      />
    </main>

    <ExperienceRuntime
      experience={byPlacement(experience, 'closing')}
      mode={mode}
      locale={locale}
    />
  </div>
);
