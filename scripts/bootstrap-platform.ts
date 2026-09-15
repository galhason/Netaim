/*
 * Opening a brand-new platform.
 *
 * A fresh database is a closed circle. The Studio opens only for an
 * account that holds a grant; an account is created by registering for
 * a conference; a conference is created in the Studio. Nothing in the
 * product breaks that circle, and the Payload panel cannot either — the
 * first superuser it creates holds no grant, so it is refused the moment
 * it tries to create the organization everything else hangs from.
 *
 * So the circle is broken once, here, deliberately, from the server's
 * own shell:
 *
 *   npx tsx scripts/bootstrap-platform.ts "Gal Hason" gal@netaim26.org
 *
 * It creates the organization if there is none, opens a platform account
 * for that person, and grants it Owner. Nothing else. The password is
 * not taken as an argument — an argument lands in the shell history and
 * in `ps` — so the script sets none and the person claims the account
 * through "forgot password" on the live site, which also proves the mail
 * relay works before anybody is invited.
 *
 * It refuses to run twice. Once a grant exists the platform has an
 * owner, and a second run would be a way to mint one quietly.
 */
import { getPayload } from 'payload';
import config from '@payload-config';
import { accountGrantRepository } from '@/infrastructure';

const [, , rawName, rawEmail, rawOrg] = process.argv;
const name = (rawName ?? '').trim();
const email = (rawEmail ?? '').trim().toLowerCase();
const orgName = (rawOrg ?? 'נטעים').trim();

const die = (message: string): never => {
  console.error(`\n  ${message}\n`);
  process.exit(1);
};

if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  die(
    'Usage: npx tsx scripts/bootstrap-platform.ts "<full name>" <email> [organization name]',
  );
}

const payload = await getPayload({ config });

const grants = await payload.count({
  collection: 'account-grants',
  overrideAccess: true,
});
if (grants.totalDocs > 0) {
  die(
    'This platform already has an owner. Grant further access from the Studio (People → Access), not from here.',
  );
}

const organizations = await payload.find({
  collection: 'organizations',
  limit: 1,
  depth: 0,
  overrideAccess: true,
});

const organization =
  organizations.docs[0] ??
  (await payload.create({
    collection: 'organizations',
    data: { name: orgName, slug: 'netaim' },
    overrideAccess: true,
  }));

console.log(`  Organization: ${organization.name} (#${organization.id})`);

const existing = await payload.find({
  collection: 'participants',
  where: { email: { equals: email } },
  limit: 1,
  depth: 0,
  overrideAccess: true,
});

const account =
  existing.docs[0] ??
  (await payload.create({
    collection: 'participants',
    data: {
      organization: organization.id,
      name,
      email,
      preferredLocale: 'he',
    },
    overrideAccess: true,
  }));

console.log(`  Account:      ${account.email} (#${account.id})`);

/*
 * Through the repository, not as a row of its own.
 *
 * Writing the grant straight into the collection looks identical and is
 * not: the technical principal in `users`, which every Studio read is
 * performed as, is derived by the repository and by nothing else. A
 * grant without it opens the Studio and then shows empty lists
 * everywhere — the most confusing possible way for this to half-work,
 * and exactly what the first version of this script did.
 */
const granted = await accountGrantRepository.createGrant({
  accountId: String(account.id),
  role: 'owner',
  eventSlug: null,
  grantedById: null,
});
if (!granted) {
  die('The grant could not be written. Nothing else was changed.');
}

console.log('  Grant:        owner, platform-wide');
console.log('');
console.log('  Next: open https://<your-domain>/he/me, choose "forgot password",');
console.log(`  and claim ${email}. Then /studio is yours.`);
console.log('');
process.exit(0);
