import type { SessionItem as SessionItemData } from '../types/scene-content';

interface SessionItemProps {
  session: SessionItemData;
}

const SessionItem = ({ session }: SessionItemProps) => (
  <li>
    <h4>{session.title}</h4>
    <p>
      <time dateTime={session.startTime}>{session.startTime}</time>
      {' – '}
      <time dateTime={session.endTime}>{session.endTime}</time>
    </p>
    {session.room ? <p>{session.room}</p> : null}
    {session.track ? <p>{session.track}</p> : null}
  </li>
);

export default SessionItem;
