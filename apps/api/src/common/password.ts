import { randomBytes } from 'crypto';

// Ambiguous characters (0/O, 1/l/I) removed so a generated password can be read
// aloud / typed from a WhatsApp message without confusion.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generate a random, human-typable password for a freshly onboarded owner. */
export function generatePassword(length = 10): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
