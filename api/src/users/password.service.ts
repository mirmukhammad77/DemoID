import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
const options = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, options, (error, hash) => error ? reject(error) : resolve(hash)));
}
@Injectable()
export class PasswordService {
  async hash(password: string) {
    const salt = randomBytes(16);
    const hash = await derive(password, salt);
    return ['scrypt', 'v1', '16384', '8', '1', salt.toString('hex'), hash.toString('hex')].join('$');
  }
  async verify(password: string, encoded?: string) {
    const parts = encoded?.split('$');
    const valid = parts?.length === 7 && parts.slice(0, 5).join('$') === 'scrypt$v1$16384$8$1' && /^[a-f0-9]{32}$/.test(parts[5]) && /^[a-f0-9]{128}$/.test(parts[6]);
    const salt = valid ? Buffer.from(parts![5], 'hex') : Buffer.alloc(16);
    const actual = await derive(password, salt);
    return !!valid && timingSafeEqual(actual, Buffer.from(parts![6], 'hex'));
  }
}
