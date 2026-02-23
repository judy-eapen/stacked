/**
 * Phase 6c: AES-256-GCM encrypt/decrypt for storing Google refresh tokens.
 * Key from ENCRYPTION_KEY env (32 bytes for AES-256, base64 or hex).
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw || raw.length < 32) {
    throw new Error('ENCRYPTION_KEY must be set and at least 32 characters (or 32-byte hex/base64)')
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }
  if (raw.length >= 44 && /^[A-Za-z0-9+/]+=*$/.test(raw)) {
    const b = Buffer.from(raw, 'base64')
    if (b.length >= KEY_LENGTH) return b.subarray(0, KEY_LENGTH)
  }
  return Buffer.from(raw.slice(0, KEY_LENGTH), 'utf8')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const buf = Buffer.from(ciphertext, 'base64')
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext')
  }
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const enc = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(tag)
  return decipher.update(enc) + decipher.final('utf8')
}
