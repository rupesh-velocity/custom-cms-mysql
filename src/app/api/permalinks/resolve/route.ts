import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeBase } from '@/lib/permalinks';

export async function GET(req:Request) {
  const path=new URL(req.url).searchParams.get('path')||'/';
  const rows=await prisma.setting.findMany({where:{key:{in:['permalink_post_base','permalink_category_base','permalink_tag_base']}}});
  const s=rows.reduce((a:Record<string,string>,r:any)=>{a[r.key]=r.value||'';return a;},{});
  const postBase=normalizeBase(s.permalink_post_base);
  const catBase=normalizeBase(s.permalink_category_base)||'category';
  const tagBase=normalizeBase(s.permalink_tag_base)||'tag';
  const clean=path.replace(/^\/+|\/+$/g,'');
  let rewritePath='';
  if(postBase && clean.startsWith(`${postBase}/`)) rewritePath=`/${clean.slice(postBase.length+1)}`;
  else if(catBase!=='category' && clean.startsWith(`${catBase}/`)) rewritePath=`/category/${clean.slice(catBase.length+1)}`;
  else if(tagBase!=='tag' && clean.startsWith(`${tagBase}/`)) rewritePath=`/tag/${clean.slice(tagBase.length+1)}`;
  return NextResponse.json({rewritePath});
}
