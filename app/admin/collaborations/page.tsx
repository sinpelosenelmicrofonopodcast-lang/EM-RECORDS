import {AdminShell} from '@/components/admin/admin-shell';
import {AdminHub} from '@/components/collaborations/admin-hub';
import {requireAdminPage} from '@/lib/auth';
import {adminData} from '@/lib/collaborations/service';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdminPage();try{const data=await adminData();return <AdminShell><AdminHub initial={data}/></AdminShell>;}catch(e:any){return <AdminShell><h1 className="text-3xl text-white">Collaborations</h1><p className="text-red-300">No se pudo cargar el módulo: {e.message}</p></AdminShell>;}}
