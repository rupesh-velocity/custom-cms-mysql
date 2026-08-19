const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const mariadb = require('mariadb');

async function main() {
  console.log('Generating Tailwind safelist from database content...');
  try {
    const url = process.env.DATABASE_URL;
    
    if (!url) {
      console.log('No database URL found, using fallback safelist...');
      return;
    }
    
    const urlObj = new URL(url);
    const adapter = new PrismaMariaDb({ 
      host: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port) : 3306,
       user: urlObj.username,
      password: decodeURIComponent(urlObj.password),
      database: urlObj.pathname.substring(1)
    });
    const prisma = new PrismaClient({ adapter });
    
    const posts = await prisma.post.findMany({ select: { contentHtml: true } });
    const pages = await prisma.page.findMany({ select: { contentHtml: true } });
    const courses = await prisma.course.findMany({ select: { contentHtml: true } });
    
    let combinedHtml = '';
    for (const post of posts) if (post.contentHtml) combinedHtml += post.contentHtml + '\n';
    for (const page of pages) if (page.contentHtml) combinedHtml += page.contentHtml + '\n';
    for (const course of courses) if (course.contentHtml) combinedHtml += course.contentHtml + '\n';
    
    const outputPath = path.join(__dirname, '../src/safelist.html');
    fs.writeFileSync(outputPath, combinedHtml || '<!-- Empty safelist fallback -->');
    
    console.log(`Successfully generated src/safelist.html with ${combinedHtml.length} bytes of content`);
    
    // FETCH SETTINGS
    console.log('Fetching global settings...');
    const settings = await prisma.setting.findMany({
      where: {
        OR: [
          { key: { in: ['custom_css', 'head_scripts', 'body_scripts', 'seo_custom_webmaster_tags', 'seo_norton_verify'] } },
          { key: { startsWith: 'seo_local_' } },
          { key: { in: ['seo_social_fb_url', 'seo_social_twitter_username'] } }
        ]
      }
    });
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    
    fs.writeFileSync(path.join(__dirname, '../src/settings.json'), JSON.stringify(settingsObj, null, 2));
    console.log('Successfully generated src/settings.json');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error generating safelist or settings:', error);
    fs.writeFileSync(path.join(__dirname, '../src/safelist.html'), '<!-- Empty safelist fallback -->');
    fs.writeFileSync(path.join(__dirname, '../src/settings.json'), '{}');
  }
}

main();
