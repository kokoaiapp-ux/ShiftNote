import { ehrs } from './validation';
export { professions } from './validation';
export const ehrPlatforms=ehrs.filter(ehr=>ehr!=='Other');
export const enterpriseFeatures=['Multi-Facility Management','Organization Dashboard','Department Management','Enterprise Analytics','AI Documentation','Role-Based Access','Enterprise Security','Audit Logs','Future EHR Integrations','Priority Support'];
