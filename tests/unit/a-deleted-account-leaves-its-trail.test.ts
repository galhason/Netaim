import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * A deleted account leaves its trail standing — and goes whole or not at all.
 *
 * An Admin deleted a Netaim Admin. The grants list no longer showed him;
 * the participants list still did; and when he tried to register again
 * the form said his address was taken. The deletion had stopped half
 * way: the database refused to let go of his audit rows, after his
 * grants and registrations were already gone. Two fixes: the log admits
 * the one update a deletion needs, and the deletion is one transaction.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

describe('the deletion is one transaction', () => {
  const adapter = read('src/infrastructure/payload/payload-participant-admin.ts');

  it('opens it, rides every step on it, and commits or rolls back whole', () => {
    expect(adapter).toContain('const transactionID = await payload.db.beginTransaction();');
    expect(adapter).toContain('const req = { transactionID } as unknown as PayloadRequest;');
    expect(adapter).toContain('await payload.db.commitTransaction(transactionID);');
    expect(adapter).toContain('await payload.db.rollbackTransaction(transactionID);');
    /* Every delete inside the try carries the request. */
    const body = adapter.slice(adapter.indexOf('try {'), adapter.indexOf('} catch (error) {'));
    const deletes = body.match(/payload\.delete\(\{[\s\S]*?\}\)/g) ?? [];
    expect(deletes.length).toBeGreaterThanOrEqual(2);
    for (const call of deletes) {
      expect(call).toContain('req,');
    }
  });

  it('takes the grants and the technical principal with the person, inside the transaction', () => {
    expect(adapter).toContain("await sweep('account-grants', theirs('account'));");
    expect(adapter).toContain("collection: 'users',");
    expect(adapter).toContain('where: { email: { equals: principalEmail(account.email) } }');
    expect(adapter).toContain("await sweep('notifications', theirs('participant'));");
  });

  it('no longer revokes grants one by one before the deletion', () => {
    const service = read('src/features/studio/services/studio-participants.ts');
    expect(service).not.toContain('await revokeGrant(grant.id, actorGrants)');
    expect(service).toContain('await deleteParticipantAdmin(id);');
    /* The rules still decide first. */
    expect(service).toContain('!mayRevokeRole(actorGrants, grant.role)');
  });

  it('says why in the log when it fails, without naming the person', () => {
    const actions = read('src/app/(studio)/studio/(console)/actions.ts');
    expect(actions).toContain("log.error('account deletion failed', {");
    expect(actions).toContain('participantId: id,');
    expect(actions).toContain("redirect('/studio/participants?delete=failed');");
  });
});

describe('the log admits one update: a deleted actor letting go', () => {
  const migration = read('src/migrations/20261019_120000_a_deleted_account_leaves_its_trail.ts');

  it('only actor_id, only to NULL, nothing else changed', () => {
    expect(migration).toContain(`OLD."actor_id" IS NOT NULL`);
    expect(migration).toContain(`NEW."actor_id" IS NULL`);
    expect(migration).toContain(`(to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id')`);
    expect(migration).toContain("RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP");
  });

  it('is on the list of migrations, after the address one', () => {
    const index = read('src/migrations/index.ts');
    expect(index.indexOf("name: '20261019_120000_a_deleted_account_leaves_its_trail'")).toBeGreaterThan(
      index.indexOf("name: '20261019_090000_one_spelling_of_an_address'"),
    );
  });
});
