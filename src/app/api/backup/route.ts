import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { isAddonEnabled } from '@/lib/addons';
import { exportCms, importCms } from '@/lib/cms-transfer';

export const dynamic = 'force-dynamic';

const FULL:any=['settings','users','categories','tags','pages','posts','media','forms','menus','popups'];

export async function GET() {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAddonEnabled('addon_backup_restore_enabled'))) return NextResponse.json({ error: 'Backup & Restore is disabled.' }, { status: 403 });
  try {
    const doc=await exportCms(FULL);
    doc.kind='velocity-cms-backup';
    return new NextResponse(JSON.stringify(doc,null,2),{
      headers:{
        'Content-Type':'application/json; charset=utf-8',
        'Content-Disposition':`attachment; filename="velocity-cms-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json"`,
        'Cache-Control':'no-store'
      }
    });
  } catch(error:any) {
    console.error('Backup export failed:', error);
    return NextResponse.json({error:error?.message||'Backup failed.'},{status:500});
  }
}

export async function POST(req:Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAddonEnabled('addon_backup_restore_enabled'))) return NextResponse.json({ error: 'Backup & Restore is disabled.' }, { status: 403 });
  try {
    const doc=await req.json();
    if(doc.kind!=='velocity-cms-backup') throw new Error('This is not a supported CMS backup file.');
    return NextResponse.json({success:true,result:await importCms(doc)});
  } catch(error:any){
    console.error('Backup restore failed:', error);
    return NextResponse.json({error:error.message||'Restore failed'},{status:400});
  }
}
