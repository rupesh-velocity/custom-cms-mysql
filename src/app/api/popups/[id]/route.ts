import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context:any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const popup = await prisma.popup.findUnique({ where:{ id:Number(id) }});
  return popup ? NextResponse.json(popup) : NextResponse.json({error:'Popup not found'}, {status:404});
}

export async function PATCH(req: Request, context:any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await context.params;
    const data = await req.json();
    const popup = await prisma.popup.update({ where:{id:Number(id)}, data:{
      title: data.title,
      slug: data.slug,
      contentHtml: data.contentHtml,
      status: data.status,
      triggerType: data.triggerType,
      delaySeconds: data.delaySeconds !== undefined ? Number(data.delaySeconds) : undefined,
      scrollPercent: data.scrollPercent !== undefined ? Number(data.scrollPercent) : undefined,
      displayMode: data.displayMode,
      pageRules: data.pageRules !== undefined ? JSON.stringify(data.pageRules) : undefined,
      startAt: data.startAt === '' ? null : data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt === '' ? null : data.endAt ? new Date(data.endAt) : undefined,
    }});
    return NextResponse.json(popup);
  } catch(error:any) { return NextResponse.json({error:error.message || 'Could not update popup'}, {status:500}); }
}

export async function DELETE(req: Request, context:any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  await prisma.popup.delete({ where:{id:Number(id)}});
  return NextResponse.json({success:true});
}
