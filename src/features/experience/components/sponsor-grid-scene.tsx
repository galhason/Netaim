import type { SceneComponentProps } from '@/experience-engine';
import type { SponsorGridContent } from '../types/scene-content';

const SponsorGridScene = ({
  scene,
}: SceneComponentProps<SponsorGridContent>) => (
  <section aria-label={scene.title}>
    {scene.content.heading ? <h2>{scene.content.heading}</h2> : null}
    <ul>
      {scene.content.sponsors.map((sponsor) => (
        <li key={sponsor.id}>
          {sponsor.logoUrl ? (
            /*
             * Placeholder markup: the design-system Image primitive
             * (Component-Architecture section 2) replaces raw img tags
             * when the primitives layer is implemented.
             */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sponsor.logoUrl} alt={sponsor.logoAlt ?? sponsor.name} />
          ) : null}
          <h3>{sponsor.name}</h3>
          {sponsor.tier ? <p>{sponsor.tier}</p> : null}
        </li>
      ))}
    </ul>
  </section>
);

export default SponsorGridScene;
