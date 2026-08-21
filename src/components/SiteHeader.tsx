import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ChevronDown, LogIn, User } from 'lucide-react';
import MobileMenu from '@/components/MobileMenu';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { BASE_PATH } from '@/lib/config';

// Helper to build a nested tree from the flat items list
function buildTree(items: any[], parentId: number | null = null, homepageSlug: string = ''): any[] {
  return items
    .filter(item => item.parentId === parentId)
    .map(item => {
      // If the URL matches the homepage slug, change it to "/"
      const url = item.url === homepageSlug ? '/' : item.url;
      return {
        ...item,
        url,
        children: buildTree(items, item.id, homepageSlug)
      };
    });
}

// Recursive component for rendering menu items
function MenuNode({ node, depth = 0 }: { node: any, depth?: number }) {
  const hasChildren = node.children && node.children.length > 0;

  if (!hasChildren) {
    if (depth === 0) {
      return (
        <Link href={node.url}>
          {node.label}
        </Link>
      );
    }
    return (
      <Link 
        href={node.url}
        className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600"
      >
        {node.label}
      </Link>
    );
  }

  // Dropdown node
  if (depth === 0) {
    return (
      <div className="relative group flex items-center cursor-pointer">
        <Link href={node.url} className="flex items-center gap-1">
          {node.label}
          <ChevronDown size={14} className="opacity-70 transition-transform" />
        </Link>
        
        <div className="absolute top-full left-0 pt-2 hidden group-hover:block min-w-[200px] z-50">
          <div className="bg-white border border-gray-100 shadow-xl rounded-lg py-2">
            {node.children.map((child: any) => (
              <MenuNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer">
      <Link 
        href={node.url}
        className="flex items-center gap-1 justify-between"
      >
        {node.label}
        <ChevronDown size={14} className="opacity-70 -rotate-90" />
      </Link>
      
      <div className="absolute top-0 left-full ml-1 hidden group-hover:block min-w-[200px] bg-white border border-gray-100 shadow-xl rounded-lg py-2 z-50">
        <div className="absolute -left-1 w-1 top-0 bottom-0"></div>
        {node.children.map((child: any) => (
          <MenuNode key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}

export default async function SiteHeader({ hideMenu = false }: { hideMenu?: boolean } = {}) {
  // Fetch settings for branding and homepage
  const settingsRecords = await prisma.setting.findMany({
    where: {
      key: { in: ['site_title', 'site_icon', 'site_logo', 'homepage_displays', 'homepage_page_id'] }
    }
  });
  
  const settings = settingsRecords.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  const siteTitle = settings.site_title || 'Custom CMS';
  const siteIcon = settings.site_icon;
  const siteLogo = settings.site_logo;

  const optimizeLogoUrl = (url: string) => {
    if (!url) return url;
    return url.replace(
      /https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(v[0-9]+\/.+)/i,
      'https://res.cloudinary.com/$1/image/upload/f_auto,q_auto,h_100/$2'
    );
  };

  let homepageSlug = '';
  if (settings.homepage_displays === 'static_page' && settings.homepage_page_id) {
    const hpPage = await prisma.page.findUnique({ where: { id: parseInt(settings.homepage_page_id) } });
    if (hpPage) homepageSlug = `/${hpPage.slug}`;
  }

  // Fetch primary menu
  let primaryMenu = await prisma.menu.findUnique({
    where: { slug: 'primary' },
    include: {
      items: {
        orderBy: { order: 'asc' }
      }
    }
  });

  // Fallback: If no menu with slug 'primary' exists, grab the first menu
  if (!primaryMenu) {
    const firstMenu = await prisma.menu.findFirst({
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    });
    primaryMenu = firstMenu;
  }

  const menuTree = primaryMenu ? buildTree(primaryMenu.items, null, homepageSlug) : [];

  // Check Auth State (Skip during static build to prevent workStore invariants)
  let isAuthenticated = false;
  let userRole = '';
  
  if (process.env.npm_lifecycle_event !== 'build') {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('cms_session')?.value;
      
      if (token) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production');
        const { payload } = await jwtVerify(token, secret);
        isAuthenticated = true;
        userRole = payload.role as string;
      }
    } catch (e) {
      // Silently fail if auth verification fails
    }
  }

 const isCustomerOrSubscriber = isAuthenticated && userRole?.toLowerCase() !== 'administrator';
  
  return (
    <header className="site-header h-auto">
      <div className="container py-4 lg:h-full flex flex-wrap items-center justify-between">
        <Link href="/" className="shrink-0 flex items-center w-auto max-w-[70%]">
          {siteLogo ? (
            <img src={optimizeLogoUrl(siteLogo)} alt={siteTitle} className="logo-img max-h-12 w-auto object-contain" loading="eager" fetchPriority="high" />
          ) : siteIcon ? (
            <img src={optimizeLogoUrl(siteIcon)} alt={siteTitle} className="logo-img max-h-12 w-auto object-contain" loading="eager" fetchPriority="high" />
          ) : (
            <span className="text-xl font-bold whitespace-nowrap">{siteTitle}</span>
          )}
        </Link>
        
        <div className="flex items-center gap-4 lg:gap-10">
          {!hideMenu && (
            <nav className="main-menu hidden lg:flex items-center gap-10">
              {menuTree.map((node: any) => (
                <MenuNode key={node.id} node={node} />
              ))}
              {!primaryMenu?.items?.length && (
                <div className="text-sm text-gray-400 italic">
                  Create a menu to add links
                </div>
              )}
            </nav>
          )}
          
          <div className="hidden lg:flex items-center gap-6">
            {isAuthenticated ? (
              <div className="relative group flex items-center cursor-pointer">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[#5e3fde] py-2">
                  <User size={16} /> <span className="hidden sm:inline">My Account</span>
                  <ChevronDown size={14} className="opacity-70 transition-transform" />
                </div>
                
                <div className="absolute top-full right-0 hidden group-hover:block min-w-[160px] bg-white border border-gray-100 shadow-xl rounded-lg py-2 z-50">
                  <Link href={userRole.toLowerCase() === 'administrator' ? "/admin/" : "/my-account/"} className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[#5e3fde]">
                    Dashboard
                  </Link>
                  <form action={`${BASE_PATH}/api/users/logout`} method="POST" className="block w-full">
                    <button type="submit" className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 font-medium">
                      Logout
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[#5e3fde]">
                <LogIn size={16} /> Login
              </Link>
            )}
            
            {!isCustomerOrSubscriber && (
              <Link href="https://sharpefforts.com/fitnessarts/on-demand/" className="theme-btn theme-btn-blue ml-2">
                On Demand Classes <span></span> 
              </Link>
            )}
          </div>
          
          {!hideMenu && <MobileMenu menuTree={menuTree} isAuthenticated={isAuthenticated} userRole={userRole} />}
        </div>

        {/* Mobile-only full width button below logo/menu */}
        {/* {(!isCustomerOrSubscriber && !hideMenu) && (
          <div className="w-full mt-4 lg:hidden">
            <Link href="#on-demand" className="theme-btn theme-btn-blue w-full flex justify-center items-center">
              On Demand Classes <span className="btn-icon ml-2">↗</span>
            </Link>
          </div>
        )} */}
      </div>
    </header>
  );
}
