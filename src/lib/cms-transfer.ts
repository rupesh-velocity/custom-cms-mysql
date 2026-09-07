import { prisma } from '@/lib/prisma';

export const TRANSFER_TYPES=['settings','users','pages','posts','categories','tags','media','forms','menus','popups'] as const;
type TransferType=(typeof TRANSFER_TYPES)[number];

export async function exportCms(types:TransferType[]) {
  const data:any={ version:2, exportedAt:new Date().toISOString(), types, data:{} };
  if(types.includes('settings')) data.data.settings=await prisma.setting.findMany();
  if(types.includes('users')) data.data.users=await prisma.user.findMany();
  if(types.includes('categories')) data.data.categories=await prisma.category.findMany();
  if(types.includes('tags')) data.data.tags=await prisma.tag.findMany();
  if(types.includes('pages')) data.data.pages=await prisma.page.findMany();
  if(types.includes('posts')) data.data.posts=await prisma.post.findMany({include:{categories:true,tags:true}});
  if(types.includes('media')) data.data.media=await prisma.media.findMany();
  if(types.includes('forms')) data.data.forms=await prisma.form.findMany();
  if(types.includes('menus')) data.data.menus=await prisma.menu.findMany({include:{items:true}});
  if(types.includes('popups')) data.data.popups=await prisma.popup.findMany();
  return data;
}

const date=(v:any)=>v?new Date(v):undefined;
const nullableDate=(v:any)=>v?new Date(v):null;

export async function importCms(doc:any) {
  if(!doc || !doc.data) throw new Error('Invalid CMS export file.');
  const d=doc.data;
  const result:Record<string,number>={};
  const userIdMap=new Map<number,number>();
  const categoryIdMap=new Map<number,number>();

  const resolveAuthorId=async(sourceId:any)=>{
    if(!sourceId) return null;
    const mapped=userIdMap.get(Number(sourceId));
    if(mapped) return mapped;
    const existing=await prisma.user.findUnique({where:{id:Number(sourceId)}}).catch(()=>null);
    return existing?.id || null;
  };

  if(Array.isArray(d.settings)) {
    for(const x of d.settings) await prisma.setting.upsert({where:{key:x.key},update:{value:x.value},create:{key:x.key,value:x.value}});
    result.settings=d.settings.length;
  }

  if(Array.isArray(d.users)) {
    for(const x of d.users) {
      const existing=await prisma.user.findFirst({where:{OR:[{email:x.email},{username:x.username}]}});
      const payload={username:x.username,email:x.email,password:x.password,firstName:x.firstName,lastName:x.lastName,bio:x.bio||null,phone:x.phone||null,twilioTwoFactorEnabled:!!x.twilioTwoFactorEnabled,role:x.role};
      const row=existing
        ? await prisma.user.update({where:{id:existing.id},data:payload})
        : await prisma.user.create({data:{...payload,createdAt:date(x.createdAt),updatedAt:date(x.updatedAt)}});
      if(x.id) userIdMap.set(Number(x.id),row.id);
    }
    result.users=d.users.length;
  }

  if(Array.isArray(d.categories)) {
    for(const x of d.categories) {
      const row=await prisma.category.upsert({
        where:{slug:x.slug},
        update:{name:x.name,description:x.description},
        create:{name:x.name,slug:x.slug,description:x.description,createdAt:date(x.createdAt),updatedAt:date(x.updatedAt)}
      });
      if(x.id) categoryIdMap.set(Number(x.id),row.id);
    }
    for(const x of d.categories) if(x.parentId) {
      const childId=categoryIdMap.get(Number(x.id));
      const parentId=categoryIdMap.get(Number(x.parentId));
      if(childId && parentId && childId!==parentId) await prisma.category.update({where:{id:childId},data:{parentId}});
    }
    result.categories=d.categories.length;
  }

  if(Array.isArray(d.tags)) {
    for(const x of d.tags) await prisma.tag.upsert({
      where:{slug:x.slug},
      update:{name:x.name,description:x.description},
      create:{name:x.name,slug:x.slug,description:x.description,createdAt:date(x.createdAt),updatedAt:date(x.updatedAt)}
    });
    result.tags=d.tags.length;
  }

  if(Array.isArray(d.pages)) {
    for(const x of d.pages) {
      const {id,author,createdAt,updatedAt,...rest}=x;
      rest.publishedAt=nullableDate(rest.publishedAt);
      rest.authorId=await resolveAuthorId(rest.authorId);
      await prisma.page.upsert({where:{slug:x.slug},update:rest,create:{...rest,createdAt:date(createdAt),updatedAt:date(updatedAt)}});
    }
    result.pages=d.pages.length;
  }

  if(Array.isArray(d.posts)) {
    for(const x of d.posts) {
      const {id,categories,tags,author,createdAt,updatedAt,...rest}=x;
      rest.publishedAt=nullableDate(rest.publishedAt);
      rest.authorId=await resolveAuthorId(rest.authorId);
      const categorySlugs=(categories||[]).map((c:any)=>c.slug);
      const tagSlugs=(tags||[]).map((t:any)=>t.slug);
      const catRows=categorySlugs.length?await prisma.category.findMany({where:{slug:{in:categorySlugs}}}):[];
      const tagRows=tagSlugs.length?await prisma.tag.findMany({where:{slug:{in:tagSlugs}}}):[];
      await prisma.post.upsert({
        where:{slug:x.slug},
        update:{...rest,categories:{set:catRows.map((r:any)=>({id:r.id}))},tags:{set:tagRows.map((r:any)=>({id:r.id}))}},
        create:{...rest,createdAt:date(createdAt),updatedAt:date(updatedAt),categories:{connect:catRows.map((r:any)=>({id:r.id}))},tags:{connect:tagRows.map((r:any)=>({id:r.id}))}}
      });
    }
    result.posts=d.posts.length;
  }

  if(Array.isArray(d.media)) {
    for(const x of d.media) {
      const {id,createdAt,...rest}=x;
      const existing=await prisma.media.findFirst({where:{url:x.url}});
      if(existing) await prisma.media.update({where:{id:existing.id},data:rest});
      else await prisma.media.create({data:{...rest,createdAt:date(createdAt)}});
    }
    result.media=d.media.length;
  }

  if(Array.isArray(d.forms)) {
    for(const x of d.forms) {
      const {id,createdAt,updatedAt,...rest}=x;
      rest.authorId=await resolveAuthorId(rest.authorId);
      const existing=await prisma.form.findUnique({where:{shortcode:x.shortcode}});
      if(existing) await prisma.form.update({where:{id:existing.id},data:rest});
      else await prisma.form.create({data:{...rest,createdAt:date(createdAt),updatedAt:date(updatedAt)}});
    }
    result.forms=d.forms.length;
  }

  if(Array.isArray(d.menus)) {
    for(const x of d.menus) {
      const menu=await prisma.menu.upsert({
        where:{slug:x.slug},update:{name:x.name},create:{name:x.name,slug:x.slug,createdAt:date(x.createdAt),updatedAt:date(x.updatedAt)}
      });
      await prisma.menuItem.deleteMany({where:{menuId:menu.id}});
      const pending=[...(x.items||[])];
      const idMap=new Map<number,number>();
      for(const item of pending.filter((i:any)=>!i.parentId)) {
        const c=await prisma.menuItem.create({data:{label:item.label,url:item.url,order:item.order||0,menuId:menu.id}});
        idMap.set(Number(item.id),c.id);
      }
      // Multiple passes support deeper nested menus, not only one child level.
      let remaining=pending.filter((i:any)=>i.parentId), guard=0;
      while(remaining.length && guard++<20) {
        const next:any[]=[];
        for(const item of remaining) {
          const parentId=idMap.get(Number(item.parentId));
          if(!parentId){next.push(item);continue;}
          const c=await prisma.menuItem.create({data:{label:item.label,url:item.url,order:item.order||0,menuId:menu.id,parentId}});
          idMap.set(Number(item.id),c.id);
        }
        if(next.length===remaining.length) break;
        remaining=next;
      }
    }
    result.menus=d.menus.length;
  }

  if(Array.isArray(d.popups)) {
    for(const x of d.popups) {
      const {id,createdAt,updatedAt,...rest}=x;
      rest.startAt=nullableDate(rest.startAt); rest.endAt=nullableDate(rest.endAt);
      await prisma.popup.upsert({where:{slug:x.slug},update:rest,create:{...rest,createdAt:date(createdAt),updatedAt:date(updatedAt)}});
    }
    result.popups=d.popups.length;
  }
  return result;
}
