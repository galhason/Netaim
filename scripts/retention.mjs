import { spawn } from 'node:child_process';

/*
 * The front door of the retention command.
 *
 * It exists for one dull reason: `payload run` does not forward command
 * line arguments to the script it runs — `process.argv` arrives holding
 * only node and the payload binary. So the arguments are parsed here,
 * where argv still works, handed over as environment variables, and the
 * real work happens in `retention.ts`, which needs the Payload API.
 *
 *   npm run retention:status
 *       Lists conferences past their retention deadline. Erases nothing.
 *
 *   npm run retention:purge -- <slug> --confirm
 *       Erases one named conference, for good.
 *
 * Both the name and the flag are required for the second form. A
 * command that empties a room full of people should not be reachable by
 * pressing Up and Enter.
 */
const args = process.argv.slice(2);
const purge = args.includes('--purge');
const confirm = args.includes('--confirm');
const slug = args.find((entry) => !entry.startsWith('--')) ?? '';

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['payload', 'run', 'scripts/retention.ts'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      RETENTION_MODE: purge ? 'purge' : 'status',
      RETENTION_SLUG: slug,
      RETENTION_CONFIRM: confirm ? 'yes' : '',
    },
  },
);

child.on('exit', (code) => process.exit(code ?? 0));
