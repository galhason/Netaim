export {
  getStudioAccess,
  getStudioCreator,
  requireCapability,
} from './services/studio-auth';
export type { StudioAccess } from './services/studio-auth';
export { getStudioHome } from './services/studio-home';
export { buildHomeDigest } from './utils/home-digest';
export type {
  StudioHomeDigest,
  HomeContinue,
  HomeUpcoming,
} from './utils/home-digest';
export { searchStudio } from './services/studio-search';
export { getStudioLocale } from './services/studio-locale';
export { getProductionLog } from './services/studio-activity';
export {
  cancelParticipantRegistration,
  deleteParticipantAccount,
  getParticipantsAdmin,
  moveParticipantRegistration,
  renameParticipant,
  searchAccounts,
  setParticipantBlocked,
} from './services/studio-participants';
export type {
  AccountSearchView,
  ParticipantAdminView,
} from './types/participants';
export type { ProductionLogEntry } from './types/activity';
export type { StudioCreator, StudioIdentityGateway } from './types/creator';
export type {
  StudioCommand,
  CommandScope,
  StudioSearchKind,
  StudioSearchResult,
  StudioSearchGateway,
} from './types/command';
export { default as StudioShell } from './components/studio-shell';
export { default as StudioSignIn } from './components/studio-signin';
export { default as ConsoleShell } from './components/console/console-shell';
export { default as ConsoleCanvas } from './components/console/console-canvas';
export { default as CanvasSelectBridge } from './components/console/canvas-select-bridge';
export {
  CTextField,
  CTextAreaField,
  CSelectField,
  CMediaPicker,
  CMediaMultiPicker,
  CSaveButton,
} from './components/console/console-fields';
export {
  CONSOLE_UI,
  CONSOLE_SCENE_LABELS,
  CONFERENCE_ACT_LABELS,
  SCENE_VARIANT_LABELS,
  SCENE_DENSITY_LABELS,
  SCENE_EMPHASIS_LABELS,
  HOMEPAGE_SCENE_GROUPS,
  CONFERENCE_SCENE_GROUPS,
  REGISTRATION_STATUS_LABELS,
} from './constants/console';
export type {
  HomepageInspectorGroup,
  ConferenceInspectorGroup,
} from './constants/console';
export { default as WorkspaceJourney } from './components/workspace-journey';
export { default as EmptyState } from './components/empty-state';
export {
  STUDIO_AREAS,
  HOME_SECTIONS,
  STUDIO_MESSAGES,
} from './constants/navigation';
export type { StudioArea } from './constants/navigation';
export { STUDIO_COMMANDS } from './constants/commands';
export { EMPTY_STATES } from './constants/empty-states';
export type { EmptyStateCopy } from './constants/empty-states';
export {
  matchCommands,
  scoreCommand,
  scoreText,
  normalizeQuery,
} from './utils/command-match';
export { PHASE_ADAPTATION } from './constants/adaptive';
export type { PhaseAdaptation } from './constants/adaptive';
export { HOME_SENTENCES } from './constants/home-sentences';
export {
  WORKSPACE_AREAS,
  WORKSPACE_MESSAGES,
  PHASE_LABELS,
} from './constants/workspace';
export type { WorkspaceArea } from './constants/workspace';
export {
  listTeamMembers,
  addTeamMember,
  renameTeamMember,
} from './services/studio-team';
export type { TeamMember, AddTeamMemberInput } from './types/team';
export {
  EDITOR_MESSAGES,
  ROLE_LABELS,
  ATMOSPHERE_LABELS,
} from './constants/editors';
export {
  FormSection,
  FieldGrid,
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
  SaveButton,
} from './components/form-fields';
