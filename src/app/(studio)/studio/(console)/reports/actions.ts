'use server';

import { revalidatePath } from 'next/cache';
import { audit } from '@/features/access';
import { isReportStatus, setReportStatus } from '@/features/networking';
import { actorFor } from '@/features/studio';

/*
 * Handling a report. The act is small — a status moves — but it is the
 * moment the platform answers a person who said they were harmed, so it
 * is capability-checked at the door and written to the audit trail with
 * the hand that moved it. A report nobody can be shown to have handled
 * is the same as a report nobody handled.
 */
export const setReportStatusAction = async (formData: FormData) => {
  const id = String(formData.get('id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const actor = await actorFor('participants:manage');
  if (!actor || !id || !isReportStatus(status)) {
    return;
  }
  const moved = await setReportStatus(id, status, {
    id: actor.id,
    name: actor.name,
  });
  if (!moved) {
    return;
  }
  await audit(actor, 'safety.reportHandled', undefined, {
    reportId: id,
    status,
  });
  revalidatePath('/studio/reports');
};
