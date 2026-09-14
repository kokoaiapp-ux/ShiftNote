export class EnterpriseError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function text(value: unknown, label: string, max=200) { if (typeof value !== 'string' || !value.trim() || value.trim().length>max) throw new EnterpriseError(`Enter a valid ${label}.`); return value.trim(); }
export function optional(value: unknown,max=200) { if (value===undefined || value===null || value==='') return null; return text(value,'value',max); }
export function email(value:unknown) { const v=text(value,'email',254).toLowerCase(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new EnterpriseError('Enter a valid email.'); return v; }
export function uuid(value:unknown) { const v=text(value,'identifier',36); if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) throw new EnterpriseError('Invalid identifier.'); return v; }
export function choice(value:unknown, options:readonly string[]) { if(typeof value!=='string'||!options.includes(value)) throw new EnterpriseError('Invalid selection.'); return value; }
export function integer(value:unknown,min=1,max=1000000) { const n=Number(value); if(!Number.isSafeInteger(n)||n<min||n>max) throw new EnterpriseError('Enter a valid number.'); return n; }
export function password(value:unknown) { const p=text(value,'password',128); if(p.length<12) throw new EnterpriseError('Use a password of at least 12 characters.'); return p; }
export function object(value:unknown): Record<string,unknown> { if(!value||typeof value!=='object'||Array.isArray(value)) throw new EnterpriseError('Invalid request.'); return value as Record<string,unknown>; }
export function isoDate(value:unknown) { const v=text(value,'date',10); if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v) throw new EnterpriseError('Invalid date.'); return v; }
export const leadStatuses = ['New','Discovery Scheduled','Demo Completed','Contract Sent','Contract Signed','Payment Received','Approved','Active'] as const;
export const ehrs = ['Epic','PointClickCare','Oracle Health','athenahealth','MEDITECH','eClinicalWorks','MatrixCare','Homecare Homebase','Other'] as const;
export const professions = ['Nurses','Nurse Practitioners','Physicians','Physician Assistants','Physical Therapists','Occupational Therapists','Speech Therapists','Pharmacists','Dietitians','Other'];
