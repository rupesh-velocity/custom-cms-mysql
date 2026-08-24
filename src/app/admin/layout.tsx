import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from 'react-hot-toast';
import { prisma } from '@/lib/prisma';
import { BASE_PATH } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let enableProducts = false;
  let siteTitle = 'Velocity CMS';
  let siteIcon = `${BASE_PATH}/velocity-logo.png`;
  let dbError = null;

  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ['enable_physical_products', 'site_title', 'site_icon'] }
      }
    });
    
    settings.forEach((setting: any) => {
      if (setting.key === 'enable_physical_products') enableProducts = setting.value === 'true';
      if (setting.key === 'site_title' && setting.value) siteTitle = setting.value;
      if (setting.key === 'site_icon' && setting.value) siteIcon = setting.value;
    });
  } catch (error: any) {
    console.error("Database connection failed in AdminLayout:", error);
    dbError = error.message;
  }

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-lg w-full text-center border-t-4 border-red-500">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Database Connection Error</h2>
          <p className="text-gray-700 mb-4">
            Could not connect to the database. This usually means that your <strong>DATABASE_URL</strong> environment variable is missing in Vercel, or the database server is unreachable/IP-restricted.
          </p>
          <div className="bg-gray-100 p-4 rounded text-left text-sm text-red-800 overflow-auto max-h-48 mb-6">
            <code>{dbError}</code>
          </div>
          <p className="text-gray-600 text-sm">Please check your Vercel project environment variables and database settings.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen bg-gray-50 font-sans">
        <Toaster position="top-right" />
        <Sidebar enableProducts={enableProducts} siteTitle={siteTitle} siteIcon={siteIcon} />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
