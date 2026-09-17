export { default as DietarySelect } from './components/dietary-select';
export {
  DIETARY_KEYS,
  DIETARY_LABELS,
  dietaryKeyOf,
  dietaryLabel,
  dietaryOptionsFor,
  type DietaryKey,
} from './constants/dietary';
export {
  getRegistrationSettings,
  saveRegistrationSettings,
} from './services/registration-settings-service';
export {
  getRegistrationSituation,
} from './services/capacity-service';
export type { RegistrationSituation } from './services/capacity-service';
export {
  registerForEvent,
  approveRegistration,
  declineRegistration,
  promoteFromWaitlist,
  cancelRegistration,
  listRegistrations,
  getRegistrationCounts,
} from './services/registration-service';
export {
  requestMagicLink,
  requestAccountLink,
  consumeMagicLink,
  establishSession,
  currentParticipant,
  emailHasAccount,
  clearSession,
  clearAllSessions,
  signInWithPassword,
  setMyPassword,
  applyPasswordHash,
  passwordHashFor,
  completeTotpSignIn,
  myTotpStatus,
  beginTotpEnrollment,
  confirmTotpEnrollment,
  disableTotp,
  saveMyLocalePreference,
  myLocalePreference,
} from './services/participant-identity-service';
export type {
  TotpSignInOutcome,
  TotpStatus,
} from './services/participant-identity-service';
export type {
  PasswordSignInResult,
} from './services/participant-identity-service';
export {
  PASSWORD_POLICY_TEXT,
  isStrongPassword,
  passwordSchema,
} from './schemas/password';
export {
  getMyDetails,
  getParticipantRegistration,
  myContactPreferences,
  myAreaHref,
  myRegisteredEventSlugs,
  saveMyContactPreferences,
  updateMyDetails,
  updateMyPhoto,
} from './services/participant-me-service';
export type {
  ContactPreferences,
  ContactProfile,
  ParticipantDetailsInput,
  ParticipantDetailsView,
} from './types/identity';
export type { ParticipantRegistration } from './services/participant-me-service';
export { REGISTRATION_MESSAGES } from './constants/messages';
export { PUBLIC_STATE_LABELS } from './constants/states';
export { parseRegisterForm } from './schemas/register-form';
export type { RegisterFormValues } from './schemas/register-form';
export type {
  RegistrationSettingsDTO,
  RegistrationSummary,
  ParticipantSummary,
  RegisterInput,
  RegisterResult,
  RegistrationCounts,
} from './types/registration';

export {
  beginEmailVerification,
  confirmEmailVerification,
  reissueEmailVerification,
  CODE_TTL_MS,
} from './services/email-verification-service';
export type {
  BeginOutcome,
  ConfirmOutcome,
} from './services/email-verification-service';
export type {
  PendingRegistration,
} from './types/email-verification';
export {
  OnboardingFrame,
  OnboardingLayout,
  PromoPanel,
  Sprout,
  ArrowOn,
  ONBOARDING_COPY,
  onboardingCls,
  pickCopy,
} from './components/onboarding-shell';
export { requireParticipant } from './services/participant-gate';
