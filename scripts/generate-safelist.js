const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const safelistPath = path.join(__dirname, '../src/safelist.html');
const settingsPath = path.join(__dirname, '../src/settings.json');

const permanentSafelist = `
<!-- Permanent Tailwind safelist for CMS dynamic layouts -->
<div class="hidden">
  w-full w-auto
  w-1/2 w-1/3 w-2/3 w-1/4 w-3/4 w-1/5 w-2/5 w-3/5 w-4/5

  sm:w-full sm:w-auto sm:w-1/2 sm:w-1/3 sm:w-2/3 sm:w-1/4 sm:w-3/4 sm:w-1/5 sm:w-2/5 sm:w-3/5 sm:w-4/5
  md:w-full md:w-auto md:w-1/2 md:w-1/3 md:w-2/3 md:w-1/4 md:w-3/4 md:w-1/5 md:w-2/5 md:w-3/5 md:w-4/5
  lg:w-full lg:w-auto lg:w-1/2 lg:w-1/3 lg:w-2/3 lg:w-1/4 lg:w-3/4 lg:w-1/5 lg:w-2/5 lg:w-3/5 lg:w-4/5
  xl:w-full xl:w-auto xl:w-1/2 xl:w-1/3 xl:w-2/3 xl:w-1/4 xl:w-3/4 xl:w-1/5 xl:w-2/5 xl:w-3/5 xl:w-4/5

  flex inline-flex block inline-block hidden
  flex-wrap flex-nowrap flex-col flex-row
  sm:flex-row md:flex-row lg:flex-row xl:flex-row
  sm:flex-col md:flex-col lg:flex-col xl:flex-col

  items-start items-center items-end items-stretch
  justify-start justify-center justify-between justify-end

  grid grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4
  sm:grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 sm:grid-cols-4
  md:grid-cols-1 md:grid-cols-2 md:grid-cols-3 md:grid-cols-4
  lg:grid-cols-1 lg:grid-cols-2 lg:grid-cols-3 lg:grid-cols-4

  gap-0 gap-1 gap-2 gap-3 gap-4 gap-5 gap-6 gap-8 gap-10 gap-12
  gap-x-0 gap-x-1 gap-x-2 gap-x-3 gap-x-4 gap-x-5 gap-x-6 gap-x-8 gap-x-10 gap-x-12
  gap-y-0 gap-y-1 gap-y-2 gap-y-3 gap-y-4 gap-y-5 gap-y-6 gap-y-8 gap-y-10 gap-y-12

  p-0 p-1 p-2 p-3 p-4 p-5 p-6 p-8 p-10 p-12
  px-0 px-1 px-2 px-3 px-4 px-5 px-6 px-8 px-10 px-12
  py-0 py-1 py-2 py-3 py-4 py-5 py-6 py-8 py-10 py-12
  pt-0 pt-1 pt-2 pt-3 pt-4 pt-5 pt-6 pt-8 pt-10 pt-12
  pb-0 pb-1 pb-2 pb-3 pb-4 pb-5 pb-6 pb-8 pb-10 pb-12
  pl-0 pl-1 pl-2 pl-3 pl-4 pl-5 pl-6 pl-8 pl-10 pl-12
  pr-0 pr-1 pr-2 pr-3 pr-4 pr-5 pr-6 pr-8 pr-10 pr-12

  m-0 m-1 m-2 m-3 m-4 m-5 m-6 m-8 m-10 m-12
  mx-auto mx-0 mx-1 mx-2 mx-3 mx-4 mx-5 mx-6 mx-8 mx-10 mx-12
  my-0 my-1 my-2 my-3 my-4 my-5 my-6 my-8 my-10 my-12
  mt-0 mt-1 mt-2 mt-3 mt-4 mt-5 mt-6 mt-8 mt-10 mt-12
  mb-0 mb-1 mb-2 mb-3 mb-4 mb-5 mb-6 mb-8 mb-10 mb-12

  text-left text-center text-right
  relative absolute fixed sticky
  top-0 top-4 top-8 top-10 top-12 top-20 top-24 top-28 top-32
  overflow-hidden overflow-visible
  rounded rounded-lg rounded-xl rounded-2xl rounded-3xl
  border border-gray-100 border-gray-200
  bg-white bg-gray-50
  shadow shadow-lg shadow-xl
</div>
`;

function readExisting(filePath, fallback = '') {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (_) {}
  return fallback;
}

function writeSafelist(dynamicHtml = '') {
  const finalHtml = `${permanentSafelist}\n${dynamicHtml || ''}`;
  fs.writeFileSync(safelistPath, finalHtml);
}

async function main() {
  console.log('Generating Tailwind safelist from database content...');

  let prisma;

  try {
    const url = process.env.DATABASE_URL;

    if (!url) {
      console.warn('No DATABASE_URL found. Writing permanent safelist only.');
      writeSafelist(readExisting(safelistPath));
      return;
    }

    const urlObj = new URL(url);

    const adapter = new PrismaMariaDb({
      host: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port, 10) : 3306,
      user: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      database: urlObj.pathname.substring(1),
      connectionLimit: 1,
    });

    prisma = new PrismaClient({ adapter });

    const posts = await prisma.post.findMany({ select: { contentHtml: true } });
    const pages = await prisma.page.findMany({ select: { contentHtml: true } });
    const courses = await prisma.course.findMany({ select: { contentHtml: true } });

    let combinedHtml = '';

    for (const post of posts) if (post.contentHtml) combinedHtml += post.contentHtml + '\n';
    for (const page of pages) if (page.contentHtml) combinedHtml += page.contentHtml + '\n';
    for (const course of courses) if (course.contentHtml) combinedHtml += course.contentHtml + '\n';

    writeSafelist(combinedHtml);

    console.log(
      `Successfully generated src/safelist.html with ${combinedHtml.length} bytes of DB content plus permanent classes.`
    );

    console.log('Fetching global settings...');

    const settings = await prisma.setting.findMany({
      where: {
        OR: [
          {
            key: {
              in: [
                'custom_css',
                'head_scripts',
                'body_scripts',
                'seo_custom_webmaster_tags',
                'seo_norton_verify',
              ],
            },
          },
          { key: { startsWith: 'seo_local_' } },
          { key: { in: ['seo_social_fb_url', 'seo_social_twitter_username'] } },
        ],
      },
    });

    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    fs.writeFileSync(settingsPath, JSON.stringify(settingsObj, null, 2));
    console.log('Successfully generated src/settings.json');
  } catch (error) {
    console.error('Error generating safelist or settings:', error);

    const existingSafelist = readExisting(safelistPath, '');
    const existingSettings = readExisting(settingsPath, '{}');

    writeSafelist(existingSafelist);

    if (!fs.existsSync(settingsPath) || existingSettings.trim() === '') {
      fs.writeFileSync(settingsPath, '{}');
    } else {
      fs.writeFileSync(settingsPath, existingSettings);
    }

    console.warn('Build fallback used: kept existing safelist/settings and added permanent layout safelist.');
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch (_) {}
    }
  }
}

main();