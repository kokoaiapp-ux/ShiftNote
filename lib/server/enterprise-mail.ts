import 'server-only';
import nodemailer from 'nodemailer';
import { EnterpriseError } from '@/lib/enterprise/validation';
function transport() {
  const host=process.env.ENTERPRISE_SMTP_HOST, user=process.env.ENTERPRISE_SMTP_USER, pass=process.env.ENTERPRISE_SMTP_PASSWORD;
  const port=Number(process.env.ENTERPRISE_SMTP_PORT||465);
  if(!host||!user||!pass||![465,587].includes(port)) throw new EnterpriseError('Enterprise email delivery is not configured.',503);
  return nodemailer.createTransport({host,port,secure:port===465,requireTLS:true,auth:{user,pass},connectionTimeout:15000,socketTimeout:20000});
}
export function enterpriseOrigin(request:Request) {
  if(process.env.NODE_ENV!=='production') return new URL(request.url).origin;
  const value=process.env.ENTERPRISE_APP_URL||'https://www.shiftnote.care';
  const url=new URL(value); if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash) throw new EnterpriseError('Invalid Enterprise application URL.',503);
  return url.origin;
}
export async function sendEnterpriseMail(email:string,url:string,kind:'setup'|'reset') {
  const from=process.env.ENTERPRISE_EMAIL_FROM||'support@shiftnote.care';
  const reset=kind==='reset'; const heading=reset?'Reset your password':'Welcome to ShiftNote Enterprise';
  const message=reset?'Use the secure link below to reset your password. If you did not request this, ignore this email.':'Your organization has been approved. Create your administrator account, review your organization, and add facilities and departments using this single-use setup link.';
  const safe=url.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  const result=await transport().sendMail({from:{name:'ShiftNote',address:from},to:email,subject:heading,text:`${heading}\n\n${message}\n\n${url}`,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#18231f"><h1>${heading}</h1><p style="line-height:1.7">${message}</p><p style="margin:32px 0"><a style="background:#176b4c;color:white;padding:14px 22px;border-radius:10px;text-decoration:none" href="${safe}">${reset?'Reset Password':'Set Up Your Organization'}</a></p><p>This link expires and cannot be reused after completion. Do not forward it.</p><p>ShiftNote · KOKO LABS</p></div>`});
  if(!result.accepted?.length) throw new EnterpriseError('The email provider did not accept the message.',502);
}
