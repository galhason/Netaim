import type { SceneComponentProps } from '@/experience-engine';
import type { ContentSceneContent } from '../types/scene-content';

const ContentScene = ({ scene }: SceneComponentProps<ContentSceneContent>) => (
  <section aria-label={scene.title}>
    {scene.content.heading ? <h2>{scene.content.heading}</h2> : null}
    <p>{scene.content.body}</p>
  </section>
);

export default ContentScene;
