'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LogIn, User } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

function isNodeActive(node: any, path: string): boolean {
  if (node.url === '/') return path === '/';
  if (node.url && node.url !== '#' && path.startsWith(node.url)) return true;
  if (node.children && node.children.length > 0) {
    return node.children.some((child: any) => isNodeActive(child, path));
  }
  return false;
}

function MobileMenuNode({ node, onClick, depth = 0, pathname }: { node: any, onClick: () => void, depth?: number, pathname: string }) {
  const hasChildren = node.children && node.children.length > 0;
  const [isOpen, setIsOpen] = useState(false);

  const isSub = depth > 0;
  const isActive = isNodeActive(node, pathname);
  
  // Relying entirely on CSS classes for active state, removed inline colors
  const activeLiClass = isActive ? 'current-menu-item current-menu-ancestor' : '';
  
  const textStyle = isSub ? "text-[15px] font-normal transition-all" : "text-[17px] font-medium transition-all";
  const paddingStyle = isSub ? "py-2.5 px-3" : "py-4 px-2";
  const borderStyle = isSub ? "" : "border-b border-gray-100";

  if (!hasChildren) {
    return (
      <li id={`mobile-menu-item-${node.id}`} className={`menu-item ${borderStyle} ${activeLiClass}`}>
        <Link 
          href={node.url}
          onClick={onClick}
          className={`block group ${textStyle} ${paddingStyle}`}
        >
          <div className="transform group-hover:translate-x-1.5 transition-transform duration-200">
            {node.label}
          </div>
        </Link>
      </li>
    );
  }

  return (
    <li id={`mobile-menu-item-${node.id}`} className={`menu-item menu-item-has-children ${borderStyle} ${activeLiClass}`}>
      <div 
        className={`flex items-center justify-between group ${paddingStyle} cursor-pointer ${textStyle}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="transform group-hover:translate-x-1.5 transition-transform duration-200">
          {node.label}
        </div>
        {isOpen ? (
          <ChevronUp size={20} />
        ) : (
          <ChevronDown size={20} className="text-gray-400 transition-colors" />
        )}
      </div>
      
      {/* Premium iOS-style Card Submenu - Proper Semantic UL */}
      {isOpen && (
        <ul className="sub-menu mt-1 mb-3 mx-1 p-2 bg-gray-50 rounded-xl space-y-1">
          {node.children.map((child: any) => (
            <MobileMenuNode key={child.id} node={child} onClick={onClick} depth={depth + 1} pathname={pathname} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function MobileMenu({ 
  menuTree, 
  isAuthenticated, 
  userRole,
  siteTitle = 'Custom CMS',
  siteLogo,
  siteIcon
}: { 
  menuTree: any[], 
  isAuthenticated?: boolean, 
  userRole?: string,
  siteTitle?: string,
  siteLogo?: string | null,
  siteIcon?: string | null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() || '';

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden flex items-center">
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 -mr-2 text-gray-800 transition-colors focus:outline-none"
        aria-label="Open Menu"
      >
        <Menu size={28} />
      </button>

      {/* Slide-out Overlay with a modern glassmorphism blur */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-out Menu with slightly rounded left corners for a premium feel */}
      <div 
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-[101] shadow-2xl rounded-l-2xl transition-transform duration-300 ease-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 flex flex-col min-h-full">
          {/* Header Row - Darker border for clear separation */}
          <div className="flex items-center justify-between mb-4 pb-5 border-b border-gray-200">
            <Link href="/" className="flex-shrink-0" onClick={() => setIsOpen(false)}>
              {siteLogo ? (
                <img src={siteLogo} alt={siteTitle} className="logo-img max-h-12 w-auto object-contain" />
              ) : siteIcon ? (
                <img src={siteIcon} alt={siteTitle} className="logo-img max-h-12 w-auto object-contain" />
              ) : (
                <span className="text-xl font-medium whitespace-nowrap text-gray-900 tracking-tight">{siteTitle}</span>
              )}
            </Link>
            <div 
              onClick={() => setIsOpen(false)}
              className="p-2 -mr-2 text-gray-400 bg-gray-50 rounded-full transition-colors cursor-pointer shadow-sm"
              aria-label="Close Menu"
            >
              <X size={22} />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col flex-grow">
            <ul id="mobile-primary-menu" className="flex flex-col mb-8 p-0 m-0">
              {menuTree.map((node) => (
                <MobileMenuNode key={node.id} node={node} onClick={() => setIsOpen(false)} pathname={pathname} />
              ))}
            </ul>

            <div className="flex flex-col space-y-2 mb-8 mt-2">
              {isAuthenticated ? (
                <>
                  <Link 
                    href={userRole?.toLowerCase() === 'administrator' ? "/admin/" : "/my-account/"}
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center gap-3 px-4 py-3 text-[17px] font-medium text-gray-800 bg-gray-50 rounded-xl transition-all"
                  >
                    <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-105 transition-transform"><User size={18} /></div>
                    My Dashboard
                  </Link>
                  <form action={`${BASE_PATH}/api/users/logout`} method="POST">
                    <button type="submit" className="group flex items-center gap-3 px-4 py-3 text-[17px] font-medium text-red-500 bg-red-50 rounded-xl transition-all w-full text-left">
                      <div className="p-1.5 bg-white rounded-lg shadow-sm text-red-400 group-hover:scale-105 transition-transform"><LogIn size={18} /></div>
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <Link 
                  href="/login" 
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-3 px-4 py-3 text-[17px] font-medium text-gray-800 bg-gray-50 rounded-xl transition-all"
                >
                  <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-105 transition-transform"><LogIn size={18} /></div>
                  Login
                </Link>
              )}
            </div>
            
            {/* Push this button to the bottom if the menu is short */}
            <div className="mt-auto pt-4">
              <Link 
                href="#on-demand" 
                onClick={() => setIsOpen(false)}
                className="theme-btn theme-btn-primary w-full flex items-center justify-center py-4 rounded-xl shadow-lg shadow-[#5e3fde]/20"
              >
                <span className="font-medium tracking-wide">On Demand Classes</span>
                <span className="btn-icon ml-2 bg-white/20 rounded-full p-1"><ChevronUp size={16} className="rotate-45" /></span>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
