import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { body, checked, enterpriseService, failure, json, limit, portalClient, requirePortal, type Portal } from './enterprise-auth';
import { enterpriseOrigin, sendEnterpriseMail } from './enterprise-mail';
import { choice, ehrs, email, EnterpriseError, integer, isoDate, leadStatuses, object, optional, password, professions, text, uuid } from '@/lib/enterprise/validation';
import type { Json } from '@/types/database';
import { canPerformAdminAction, managesEnterprise } from '@/lib/enterprise/permissions';

const tokenHash=(token:unknown)=>{const v=text(token,'setup link',128);if(!/^[a-f0-9]{64}$/.test(v))throw new EnterpriseError('Invalid or expired setup link.',410);return createHash('sha256').update(v).digest('hex');};
async function activation(token:unknown) {
  const hash=tokenHash(token), service=enterpriseService();
  const link=checked(await service.from('enterprise_activation_links').select('*').eq('token_hash',hash).maybeSingle());
  if(!link||link.used_at||link.revoked_at||Date.parse(link.expires_at)<=Date.now()) throw new EnterpriseError('Invalid or expired setup link.',410);
  const organization=checked(await service.from('organizations').select('*').eq('id',link.organization_id).maybeSingle());
  if(!organization||organization.status!=='Approved')throw new EnterpriseError('This organization is not available for setup.',410);
  return {link,organization,hash,service};
}
async function deliverApproval(data:Json,token:string,request:Request) {
  const result=object(data), service=enterpriseService(); const id=uuid(result.activation_id);
  const setupUrl=`${enterpriseOrigin(request)}/enterprise/setup/${token}`;
  try { await sendEnterpriseMail(email(result.email),setupUrl,'setup');checked(await service.from('enterprise_activation_links').update({email_status:'sent',updated_at:new Date().toISOString()}).eq('id',id)); return {setupUrl,emailSent:true}; }
  catch { checked(await service.from('enterprise_activation_links').update({email_status:'failed',updated_at:new Date().toISOString()}).eq('id',id)); return {setupUrl,emailSent:false,message:'Organization approved, but email delivery failed. Correct SMTP settings and reissue the activation link.'}; }
}
export async function portalGet(request:Request,portal:Portal,action:string) {
  try {
    if(action==='callback') {
      const url=new URL(request.url), hash=url.searchParams.get('token_hash'); if(!hash)throw new EnterpriseError('Invalid password-reset link.');
      const client=await portalClient(portal);const {error}=await client.auth.verifyOtp({token_hash:hash,type:'recovery'});
      if(error)throw new EnterpriseError('The password-reset link expired. Request another.');
      await requirePortal(portal);
      return new Response(null,{status:303,headers:{Location:`/${portal}/reset-password`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
    }
    const {client,user,organizationId,role}=await requirePortal(portal);
    if(action==='session')return json({user:{id:user.id,email:user.email},organizationId,role});
    if(action!=='workspace')throw new EnterpriseError('Not found.',404);
    if(portal==='admin') {
      const [organizations,leads,contracts,integrations,tickets,audit,activations]=await Promise.all([
        client.from('organizations').select('*').order('created_at',{ascending:false}).limit(500),client.from('enterprise_leads').select('*').order('created_at',{ascending:false}).limit(500),
        client.from('enterprise_contracts').select('*').order('created_at',{ascending:false}).limit(500),client.from('enterprise_integrations').select('*').limit(500),
        client.from('enterprise_support_tickets').select('*').order('created_at',{ascending:false}).limit(500),client.from('enterprise_audit_logs').select('*').order('created_at',{ascending:false}).limit(500),
        managesEnterprise(role) ? enterpriseService().from('enterprise_activation_links').select('id,organization_id,email,expires_at,used_at,used_by,revoked_at,email_status,created_at,updated_at').order('created_at',{ascending:false}).limit(500) : Promise.resolve({data:[],error:null})
      ]); return json({role,organizations:checked(organizations),leads:checked(leads),contracts:checked(contracts),integrations:checked(integrations),tickets:checked(tickets),audit:checked(audit),activations:checked(activations)});
    }
    const org=organizationId!;
    const [organization,facilities,departments,admins,integrations,contracts,tickets,audit]=await Promise.all([
      client.from('organizations').select('*').eq('id',org).single(),client.from('facilities').select('*').eq('organization_id',org).order('name'),client.from('departments').select('*').eq('organization_id',org).order('name'),client.from('enterprise_admins').select('*').eq('organization_id',org),client.from('enterprise_integrations').select('*').eq('organization_id',org),client.from('enterprise_contracts').select('*').eq('organization_id',org).order('created_at',{ascending:false}),client.from('enterprise_support_tickets').select('*').eq('organization_id',org).order('created_at',{ascending:false}).limit(200),client.from('enterprise_audit_logs').select('*').eq('organization_id',org).order('created_at',{ascending:false}).limit(200)
    ]);return json({organization:checked(organization),facilities:checked(facilities),departments:checked(departments),admins:checked(admins),integrations:checked(integrations),contracts:checked(contracts),tickets:checked(tickets),audit:checked(audit)});
  } catch(error){return failure(error);}
}
export async function portalPost(request:Request,portal:Portal,action:string) {
  try {
    const data=await body(request);
    if(['login','forgot','setup/validate','setup/finish','leads'].includes(action))await limit(request,`${portal}:${action}`,action==='leads'?5:20);
    if(action==='login') {
      const client=await portalClient(portal);const result=await client.auth.signInWithPassword({email:email(data.email),password:text(data.password,'password',128)});
      if(result.error)throw new EnterpriseError('Email or password is incorrect.',401);
      try {await requirePortal(portal);}catch(error){await client.auth.signOut({scope:'local'});throw error;}
      return json({ok:true});
    }
    if(action==='logout') { const client=await portalClient(portal); const {error}=await client.auth.signOut({scope:'local'});if(error)throw new EnterpriseError('Unable to sign out.',503);return json({ok:true}); }
    if(action==='forgot') {
      const target=email(data.email),service=enterpriseService();
      const profile=checked(await service.from('profiles').select('auth_user_id').ilike('email',target.replaceAll('%','\\%').replaceAll('_','\\_')).maybeSingle());
      if(profile){const member=portal==='admin'?checked(await service.from('koko_admins').select('user_id').eq('user_id',profile.auth_user_id).maybeSingle()):checked(await service.from('enterprise_admins').select('user_id').eq('user_id',profile.auth_user_id).maybeSingle());
        if(member){const result=await service.auth.admin.generateLink({type:'recovery',email:target});if(result.error)throw new EnterpriseError('Password recovery is temporarily unavailable.',503);await sendEnterpriseMail(target,`${enterpriseOrigin(request)}/api/${portal}/callback?token_hash=${encodeURIComponent(result.data.properties.hashed_token)}`,'reset');}
      }return json({message:'If this account has portal access, a password-reset email has been sent.'});
    }
    if(portal==='enterprise'&&action==='leads') {
      const selected=Array.isArray(data.professions)?data.professions.map(p=>choice(p,professions)):[];
      const result=await enterpriseService().from('enterprise_leads').insert({organization_name:text(data.organization,'organization name'),contact_name:text(data.contact,'contact name'),job_title:text(data.jobTitle,'job title'),work_email:email(data.email),phone:optional(data.phone,50),country:text(data.country,'country'),state:optional(data.state),clinicians:integer(data.clinicians),facilities:integer(data.facilities),current_ehr:choice(data.ehr,ehrs),interested_in_integration:choice(data.integration,['Yes','No','Not Sure']),professions:selected,timeline:choice(data.timeline,['Immediately','Within 3 Months','Within 6 Months','Just Exploring']),notes:optional(data.notes,2000)});
      checked(result);return json({ok:true},201);
    }
    if(portal==='enterprise'&&action==='setup/validate') { const {link,organization}=await activation(data.token);return json({organization:{id:organization.id,name:organization.name,country:organization.country,state:organization.state},email:link.email,expiresAt:link.expires_at}); }
    if(portal==='enterprise'&&action==='setup/finish') {
      const {link,hash,service}=await activation(data.token); const name=text(data.name,'full name'), pass=password(data.password);
      if(!Array.isArray(data.facilities)||data.facilities.length<1||data.facilities.length>50)throw new EnterpriseError('Add between 1 and 50 facilities.');
      const facilities=data.facilities.map(value=>{const f=object(value);if(!Array.isArray(f.departments)||f.departments.length>50)throw new EnterpriseError('Invalid departments.');return {name:text(f.name,'facility name'),kind:optional(f.kind)||'Other',location:optional(f.location),departments:f.departments.map(d=>text(d,'department name'))};});
      const client=await portalClient('enterprise');
      // Existing Supabase users must prove ownership; never overwrite their password.
      let signed=await client.auth.signInWithPassword({email:link.email,password:pass});
      if(signed.error){ const created=await service.auth.admin.createUser({email:link.email,password:pass,email_confirm:true,user_metadata:{full_name:name}});if(created.error)throw new EnterpriseError('Unable to create the account. If it already exists, use its current password or reset it before setup.',409);signed=await client.auth.signInWithPassword({email:link.email,password:pass}); }
      if(signed.error||!signed.data.user)throw new EnterpriseError('Unable to sign in. Retry with the password you just created.',503);
      const result=await service.rpc('enterprise_finish_setup',{p_hash:hash,p_user:signed.data.user.id,p_name:name,p_facilities:facilities as Json});
      if(result.error)throw new EnterpriseError('Setup could not complete. The link may have expired or already been used. Your organization was not partially activated.',409);
      return json({ok:true,organizationId:result.data});
    }
    const {client,user,organizationId,role}=await requirePortal(portal);
    if(action==='reset') {const {error}=await client.auth.updateUser({password:password(data.password)});if(error)throw new EnterpriseError('Unable to update the password.',400);return json({ok:true});}
    if(portal==='admin') {
      if(!canPerformAdminAction(role,action))throw new EnterpriseError('Your internal role cannot perform this action.',403);
      const service=enterpriseService();
      if(action==='approve'||action==='reissue') {
        const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');const hours=integer(process.env.ENTERPRISE_SETUP_EXPIRY_HOURS||48,1,168);
        const result=action==='approve'?await service.rpc('enterprise_approve',{p_lead:uuid(data.id),p_actor:user.id,p_hash:hash,p_hours:hours}):await service.rpc('enterprise_reissue',{p_org:uuid(data.id),p_actor:user.id,p_hash:hash,p_hours:hours});
        if(result.error)throw new EnterpriseError('Approval could not complete. For an approved organization, use Reissue Setup Link.',409);
        return json(await deliverApproval(result.data,token,request));
      }
      if(action==='lead') {
        const id=uuid(data.id);const current=checked(await client.from('enterprise_leads').select('organization_id,status').eq('id',id).single());
        const status=choice(data.status,leadStatuses.slice(0,managesEnterprise(role)?6:5));if(!current)throw new EnterpriseError('Lead not found.',404);if(current.organization_id)throw new EnterpriseError('Approved leads follow their organization status.',409);
        if(!managesEnterprise(role)&&current.status==='Payment Received')throw new EnterpriseError('Only an owner or administrator can change payment-confirmed leads.',403);
        checked(await client.from('enterprise_leads').update({organization_name:text(data.organization_name,'organization name'),contact_name:text(data.contact_name,'contact name'),job_title:text(data.job_title,'job title'),work_email:email(data.work_email),phone:optional(data.phone,50),notes:optional(data.notes,2000),status,demo_scheduled_at:data.demo_scheduled_at?new Date(text(data.demo_scheduled_at,'demo date',40)).toISOString():null}).eq('id',id));return json({ok:true});
      }
      if(action==='organization-status') {
        const status=choice(data.status,['Active','Suspended']);const id=uuid(data.id);
        const admins=checked(await client.from('enterprise_admins').select('user_id').eq('organization_id',id));if(!admins?.length)throw new EnterpriseError('Organization must complete setup first.');
        checked(await service.from('organizations').update({status:status as 'Active'|'Suspended'}).eq('id',id));checked(await service.from('enterprise_audit_logs').insert({organization_id:id,actor_id:user.id,action:`Organization ${status}`,entity_table:'organizations',entity_id:id}));return json({ok:true});
      }
      if(action==='contract') {
        const start=isoDate(data.start_date),end=isoDate(data.end_date);if(end<start)throw new EnterpriseError('End date must follow start date.');
        const status=choice(data.status,['Draft','Sent','Signed','Expired','Cancelled']),payment=choice(data.payment_status,['Pending','Received','Overdue','Refunded']);
        const payload={organization_id:uuid(data.organization_id),start_date:start,end_date:end,status,payment_status:payment,amount_cents:integer(data.amount_cents,0,2147483647),currency:'USD',stripe_customer_id:optional(data.stripe_customer_id),stripe_subscription_id:optional(data.stripe_subscription_id),payment_received_at:payment==='Received'?new Date().toISOString():null};
        if(data.id)checked(await client.from('enterprise_contracts').update(payload).eq('id',uuid(data.id)));else checked(await client.from('enterprise_contracts').insert(payload));return json({ok:true});
      }
      if(action==='ticket') {checked(await client.from('enterprise_support_tickets').update({status:choice(data.status,['Open','In Progress','Resolved'])}).eq('id',uuid(data.id)));return json({ok:true});}
    } else {
      const org=organizationId!;
      if(action==='facility') {const payload={organization_id:org,name:text(data.name,'facility name'),kind:text(data.kind||'Other','type'),location:optional(data.location)};if(data.id)checked(await client.from('facilities').update(payload).eq('id',uuid(data.id)).eq('organization_id',org));else checked(await client.from('facilities').insert(payload));return json({ok:true});}
      if(action==='department') {const payload={organization_id:org,name:text(data.name,'department name'),facility_id:uuid(data.facility_id)};if(data.id)checked(await client.from('departments').update(payload).eq('id',uuid(data.id)).eq('organization_id',org));else checked(await client.from('departments').insert(payload));return json({ok:true});}
      if(action==='settings') {try{new Intl.DateTimeFormat('en',{timeZone:text(data.timezone,'timezone')});}catch{throw new EnterpriseError('Invalid timezone.');}checked(await client.from('organizations').update({name:text(data.name,'organization name'),country:text(data.country,'country'),state:optional(data.state),timezone:text(data.timezone,'timezone'),reporting_period:choice(data.reporting_period,['Weekly','Monthly','Quarterly']),include_time_saved:data.include_time_saved===true}).eq('id',org));return json({ok:true});}
      if(action==='ticket') {checked(await client.from('enterprise_support_tickets').insert({organization_id:org,created_by:user.id,subject:text(data.subject,'subject'),message:text(data.message,'message',4000)}));return json({ok:true});}
    }
    throw new EnterpriseError('Not found.',404);
  }catch(error){return failure(error);}
}
