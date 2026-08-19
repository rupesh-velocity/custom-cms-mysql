import { prisma } from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.findFirst();
  console.log('User:', user?.username);
  
  if (user) {
    const pages = await prisma.page.updateMany({
      where: { authorId: null },
      data: { authorId: user.id }
    });
    
    const posts = await prisma.post.updateMany({
      where: { authorId: null },
      data: { authorId: user.id }
    });
    
    console.log(`Updated ${pages.count} pages and ${posts.count} posts.`);
  } else {
    console.log('No user found to assign as author.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
