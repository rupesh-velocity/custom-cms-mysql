import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { isAddonEnabled } from '@/lib/addons';
import { exportCms, importCms, TRANSFER_TYPES } from '@/lib/cms-transfer';

export const dynamic = 'force-dynamic';

export async function GET(req:Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAddonEnabled('addon_import_export_enabled'))) return NextResponse.json({ error: 'CMS Import / Export is disabled.' }, { status: 403 });
  try {
    const url=new URL(req.url);
    const requested=(url.searchParams.get('types')||'pages,posts,media,forms').split(',').filter(Boolean);
    const types=requested.filter(x=>(TRANSFER_TYPES as readonly string[]).includes(x)) as any;
    if (!types.length) return NextResponse.json({ error:'Select at least one export type.' }, { status:400 });
    const doc=await exportCms(types);
    doc.kind='velocity-cms-export';
    return new NextResponse(JSON.stringify(doc,null,2),{
      headers:{
        'Content-Type':'application/json; charset=utf-8',
        'Content-Disposition':`attachment; filename="cms-export-${new Date().toISOString().slice(0,10)}.json"`,
        'Cache-Control':'no-store'
      }
    });
  } catch(error:any) {
    console.error('CMS export failed:', error);
    return NextResponse.json({error:error?.message||'CMS export failed.'},{status:500});
  }
}

export async function POST(req:Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAddonEnabled('addon_import_export_enabled'))) return NextResponse.json({ error: 'CMS Import / Export is disabled.' }, { status: 403 });
  try {
    const doc=await req.json();
    if (doc?.kind && doc.kind !== 'velocity-cms-export' && doc.kind !== 'velocity-cms-backup') {
      throw new Error('This is not a supported CMS export file.');
    }
    return NextResponse.json({success:true,result:await importCms(doc)});
  }
  catch(error:any){
    console.error('CMS import failed:', error);
    return NextResponse.json({error:error.message||'Import failed'},{status:400});
  }
}
