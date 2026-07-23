export {
  accountGrants,
  ensureFounder,
  grantRole,
  listAllGrants,
  revokeGrant,
} from './services/grant-service';
export type { GrantOutcome, RevokeOutcome } from './services/grant-service';
export type {
  AccountGrantView,
  CreateGrantInput,
  GrantRepository,
} from './types/grant';
