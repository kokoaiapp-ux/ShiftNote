export const metadata={title:'KOKO LABS Admin',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function Layout({children}:{children:React.ReactNode}){return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">{children}</div>;}
