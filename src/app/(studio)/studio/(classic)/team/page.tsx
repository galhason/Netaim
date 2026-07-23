import { ROLES } from '@/auth';
import {
  EDITOR_MESSAGES,
  FieldGrid,
  FormSection,
  ROLE_LABELS,
  SaveButton,
  SelectField,
  TextField,
  getStudioLocale,
  listTeamMembers,
} from '@/features/studio';
import { addTeamMemberAction, renameTeamMemberAction } from '../actions';

const TeamPage = async () => {
  const locale = await getStudioLocale();
  const members = await listTeamMembers().catch(() => []);

  const roleOptions = ROLES.map((role) => ({
    value: role,
    label: ROLE_LABELS[role]?.[locale] ?? role,
  }));

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {EDITOR_MESSAGES.teamTitle?.[locale]}
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
          {EDITOR_MESSAGES.teamIntro?.[locale]}
        </p>
      </header>

      <FormSection title={EDITOR_MESSAGES.membersList?.[locale] ?? ''}>
        <ul className="flex flex-col">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-col gap-3 border-b border-border py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{member.name || member.email}</p>
                <p className="truncate text-sm text-text-secondary">
                  {member.email}
                  <span className="mx-2 text-accent" aria-hidden="true">
                    ·
                  </span>
                  {member.roles
                    .map((role) => ROLE_LABELS[role]?.[locale] ?? role)
                    .join(', ')}
                </p>
              </div>
              <form
                action={renameTeamMemberAction}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="id" value={member.id} />
                <input
                  type="text"
                  name="name"
                  defaultValue={member.name}
                  aria-label={EDITOR_MESSAGES.memberName?.[locale]}
                  className="min-h-10 w-40 border-b border-border bg-transparent py-1 text-sm outline-none transition-colors focus:border-accent"
                />
                <button
                  type="submit"
                  className="min-h-10 rounded-lg border border-border-strong px-4 text-sm transition-colors hover:border-accent hover:text-accent"
                >
                  {EDITOR_MESSAGES.rename?.[locale]}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </FormSection>

      <FormSection title={EDITOR_MESSAGES.addMember?.[locale] ?? ''}>
        <form action={addTeamMemberAction} className="flex flex-col gap-5">
          <FieldGrid>
            <TextField
              name="name"
              label={EDITOR_MESSAGES.memberName?.[locale] ?? ''}
            />
            <TextField
              name="email"
              label={EDITOR_MESSAGES.memberEmail?.[locale] ?? ''}
            />
            <TextField
              name="password"
              label={EDITOR_MESSAGES.memberPassword?.[locale] ?? ''}
            />
            <SelectField
              name="role"
              label={EDITOR_MESSAGES.memberRole?.[locale] ?? ''}
              defaultValue="contentEditor"
              options={roleOptions}
            />
          </FieldGrid>
          <SaveButton label={EDITOR_MESSAGES.addMember?.[locale] ?? ''} />
        </form>
      </FormSection>
    </div>
  );
};

export default TeamPage;
