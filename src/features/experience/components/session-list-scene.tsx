import type { SceneComponentProps } from '@/experience-engine';
import type { SessionListContent } from '../types/scene-content';
import SessionItem from './session-item';

const SessionListScene = ({
  scene,
}: SceneComponentProps<SessionListContent>) => (
  <section aria-label={scene.title}>
    {scene.content.heading ? <h2>{scene.content.heading}</h2> : null}
    <ul>
      {scene.content.sessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
    </ul>
  </section>
);

export default SessionListScene;
