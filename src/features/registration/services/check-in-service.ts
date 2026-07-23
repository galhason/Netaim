import { applyTransition } from '@/registration-engine';
import { registrationRepository } from '@/infrastructure';
import { verifyEntranceToken } from './participant-identity-service';
import type { RegistrationSummary } from '../types/registration';

export interface CheckInResult {
  registration: RegistrationSummary;
  attended: boolean;
}

/*
 * Gate check-in: verify the entrance token, resolve the registration, and
 * record attendance (confirmed → attended). A re-scan is reported, never
 * blocked — the person at the door decides. Only a confirmed place can be
 * marked attended; the engine's state machine enforces that.
 */
export const checkInByToken = async (
  token: string,
): Promise<CheckInResult | null> => {
  const registrationId = verifyEntranceToken(token);
  if (!registrationId) {
    return null;
  }
  const current = await registrationRepository.getById(registrationId);
  if (!current) {
    return null;
  }
  if (current.status === 'attended') {
    return { registration: current, attended: false };
  }
  const result = applyTransition(current.status, 'attended');
  if (!result.ok) {
    return { registration: current, attended: false };
  }
  const updated = await registrationRepository.setStatus(
    registrationId,
    'attended',
  );
  return { registration: updated, attended: true };
};
