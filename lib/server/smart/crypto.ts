import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const opaque = () => randomBytes(32).toString('base64url');
export const hash = (value:string) => createHash('sha256').update(value).digest('hex');
export const challenge = (verifier:string) => createHash('sha256').update(verifier).digest('base64url');
export function encryptionKey(value:string|undefined) {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error('SMART encryption is not configured.');
  const key=Buffer.from(value,'base64'); if(key.length!==32)throw new Error('Invalid SMART encryption key.'); return key;
}
export function seal(value:unknown,key:Buffer,context:string) {
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(`shiftnote-smart-v1:${context}`));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
}
export function unseal<T>(value:string,key:Buffer,context:string):T {
  const [version,iv,tag,payload,...extra]=value.split('.');
  if(version!=='v1'||extra.length||!payload)throw new Error('Invalid SMART session.');
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64url'));
  decipher.setAAD(Buffer.from(`shiftnote-smart-v1:${context}`));decipher.setAuthTag(Buffer.from(tag,'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload,'base64url')),decipher.final()]).toString('utf8')) as T;
}
