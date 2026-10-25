import { b64, unb64 } from './util';
const enc = new TextEncoder();
const dec = new TextDecoder();
const ITER = 250000;
export interface Sealed { iv: string; ct: string }

export const randBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export async function deriveKey(secret: string, salt: Uint8Array, iter = ITER): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export const newMasterKey = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
export const exportKey = async (k: CryptoKey) => b64(new Uint8Array(await crypto.subtle.exportKey('raw', k)));
export const importKey = (raw: string) => crypto.subtle.importKey('raw', unb64(raw), 'AES-GCM', true, ['encrypt', 'decrypt']);

export async function seal(key: CryptoKey, data: Uint8Array): Promise<Sealed> {
  const iv = randBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  return { iv: b64(iv), ct: b64(ct) };
}
export async function open(key: CryptoKey, s: Sealed): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(s.iv) }, key, unb64(s.ct)));
}
export const sealText = (k: CryptoKey, t: string) => seal(k, enc.encode(t));
export const openText = async (k: CryptoKey, s: Sealed) => dec.decode(await open(k, s));

// wrap the master key with a password/recovery-derived key
export async function wrapMaster(master: CryptoKey, secret: string) {
  const salt = randBytes(16);
  const k = await deriveKey(secret, salt);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', master));
  return { salt: b64(salt), ...(await seal(k, raw)) };
}
export async function unwrapMaster(w: { salt: string; iv: string; ct: string }, secret: string) {
  const k = await deriveKey(secret, unb64(w.salt));
  const raw = await open(k, w);
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
}
export function newRecoveryKey() {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = randBytes(20);
  let s = '';
  r.forEach((c, i) => { s += alpha[c % 32]; if (i % 5 === 4 && i < 19) s += '-'; });
  return s;
}
export const normRecovery = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function hashPin(pin: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return b64(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, base, 256)));
}
// per-item password lock (notes, vault)
export async function lockText(pw: string, text: string) {
  const salt = randBytes(16); const k = await deriveKey(pw, salt);
  return { salt: b64(salt), ...(await sealText(k, text)) };
}
export async function unlockText(pw: string, l: { salt: string; iv: string; ct: string }) {
  const k = await deriveKey(pw, unb64(l.salt)); return openText(k, l);
}
