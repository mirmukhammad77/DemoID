import { appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export async function recordEnrollmentCleanup(databasePath: string, key: string): Promise<void> {
  const record = JSON.stringify({ key, createdAt: new Date().toISOString(), reason: 'Enrollment cleanup required' }) + '\n';
  try { await appendFile(join(dirname(databasePath), 'orphan-cleanup.jsonl'), record, { mode: 0o600 }); }
  catch { console.error('Enrollment cleanup required for object: ' + key); }
}
