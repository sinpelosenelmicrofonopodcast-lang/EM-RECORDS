import {PublicHub} from '@/components/collaborations/public-hub';
import {publicData} from '@/lib/collaborations/service';
import {buildPageMetadata} from '@/lib/seo';
export const dynamic='force-dynamic';
export const metadata=buildPageMetadata({title:'Collaborations — RBELD × EM Records',description:'Convocatorias musicales, demos privados y votación de previews para proyectos de cinco temas.',path:'/collaborations'});
export default async function Page(){try{const data=await publicData();return <main className="mx-auto max-w-6xl px-6 py-16"><PublicHub initial={data}/></main>;}catch{return <main className="mx-auto max-w-4xl px-6 py-16"><h1 className="text-3xl text-white">Collaborations</h1><p className="mt-4 text-white/60">No se pudo cargar la convocatoria. Intenta nuevamente más tarde.</p></main>;}}
