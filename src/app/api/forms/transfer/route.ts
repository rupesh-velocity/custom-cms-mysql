import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { exportCms, importCms } from '@/lib/cms-transfer';

export async function GET() {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const doc = await exportCms(['forms']);
  return new NextResponse(JSON.stringify(doc, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="forms-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

export async function POST(req: Request) {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const incoming = await req.json();
    const forms = incoming?.data?.forms;
    if (!Array.isArray(forms)) {
      return NextResponse.json({ error: 'This is not a valid Forms export file.' }, { status: 400 });
    }

    // Forms Settings only imports Forms. Ignore any unrelated payload that may
    // be present in a broader CMS export file.
    const result = await importCms({
      version: incoming.version || 2,
      types: ['forms'],
      data: { forms },
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Forms import failed' }, { status: 400 });
  }
}
