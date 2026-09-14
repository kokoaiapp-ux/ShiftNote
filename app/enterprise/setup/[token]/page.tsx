import { SetupWizard } from '@/components/enterprise/SetupWizard';
export const metadata={title:'Enterprise Setup',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({params}:{params:Promise<{token:string}>}){return <SetupWizard token={(await params).token}/>;}
