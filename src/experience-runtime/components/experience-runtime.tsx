import type { Locale } from '@/config/locales';
import { resolveScene } from '../registry/scene-registry';
import type { ExperienceDescriptor } from '../types/experience';
import type { RuntimeMode } from '../types/scene';

/*
 * The one renderer of the platform (Constitution v2 §1, §12). It takes
 * a declarative Experience and renders its scenes through the Registry.
 * A scene the Registry does not know is skipped, never crashed on —
 * the experience must always play.
 */
interface ExperienceRuntimeProps {
  experience: ExperienceDescriptor;
  mode?: RuntimeMode;
  locale: Locale;
}

export const ExperienceRuntime = ({
  experience,
  mode = 'read',
  locale,
}: ExperienceRuntimeProps) => (
  <>
    {experience.scenes
      .filter((scene) => scene.hidden !== true)
      .map((scene) => {
        const definition = resolveScene(scene.type);
        if (!definition) {
          return null;
        }
        if (definition.validate && !definition.validate(scene.content)) {
          return null;
        }
        const Renderer = definition.renderer;
        /*
         * An axis value the package never declared falls back to
         * default — the experience must always play (Constitution v2
         * §12).
         */
        const variant =
          scene.variant && definition.variants?.includes(scene.variant)
            ? scene.variant
            : undefined;
        const density =
          scene.density && definition.densities?.includes(scene.density)
            ? scene.density
            : undefined;
        const emphasis =
          scene.emphasis && definition.emphases?.includes(scene.emphasis)
            ? scene.emphasis
            : undefined;
        /*
         * Preview take: each scene is addressable, so the Studio canvas
         * can turn a click on the stage into a selection (direct
         * on-canvas editing). The public take stays untouched.
         */
        return mode === 'preview' ? (
          <div
            key={scene.id}
            data-scene-id={scene.id}
            data-scene-type={scene.type}
          >
            <Renderer
              content={scene.content}
              mode={mode}
              locale={locale}
              variant={variant}
              density={density}
              emphasis={emphasis}
            />
          </div>
        ) : (
          <Renderer
            key={scene.id}
            content={scene.content}
            mode={mode}
            locale={locale}
            variant={variant}
            density={density}
            emphasis={emphasis}
          />
        );
      })}
  </>
);
