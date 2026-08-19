'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LogIn, User } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

function MobileMenuNode({ node, onClick, depth = 0 }: { node: any, onClick: () => void, depth?: number }) {
  const hasChildren = node.children && node.children.length > 0;
  const [isOpen, setIsOpen] = useState(false);

  const isSub = depth > 0;
  const textStyle = isSub ? "text-base text-gray-600 font-normal hover:text-[#5e3fde]" : "text-lg font-medium text-gray-800 hover:text-[#5e3fde]";
  const paddingStyle = isSub ? "py-2" : "py-3";
  const borderStyle = isSub ? "" : "border-b border-gray-100";

  if (!hasChildren) {
    return (
      <Link 
        href={node.url}
        onClick={onClick}
        className={`block ${textStyle} ${paddingStyle} ${borderStyle} transition-colors`}
      >
        {node.label}
      </Link>
    );
  }

  return (
    <div className={borderStyle}>
      <div 
        className={`flex items-center justify-between ${paddingStyle} cursor-pointer ${textStyle} transition-colors`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{node.label}</span>
        {isOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
      </div>
      
      {isOpen && (
        <div className="pl-4 mt-1 mb-2 space-y-1 ml-2">
          {node.children.map((child: any) => (
            <div key={child.id} className="pl-3">
              <MobileMenuNode node={child} onClick={onClick} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MobileMenu({ menuTree, isAuthenticated, userRole }: { menuTree: any[], isAuthenticated?: boolean, userRole?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() || '';

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scrolling when menu is open
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
        className="p-2 -mr-2 text-gray-800 hover:text-blue-600 transition-colors focus:outline-none"
        aria-label="Open Menu"
      >
        <Menu size={28} />
      </button>

      {/* Slide-out Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-out Menu */}
      <div 
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-[101] shadow-2xl transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex justify-end mb-8">
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 -mr-2 text-gray-500 hover:text-red-500 transition-colors focus:outline-none"
              aria-label="Close Menu"
            >
              <X size={28} />
            </button>
          </div>

          <nav className="flex flex-col">
            {menuTree.map((node) => (
              <MobileMenuNode key={node.id} node={node} onClick={() => setIsOpen(false)} />
            ))}
            
            {isAuthenticated ? (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-1">
                <Link 
                  href={userRole?.toLowerCase() === 'administrator' ? "/admin/" : "/my-account/"}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-gray-800 hover:text-[#5e3fde] py-2 flex items-center gap-2"
                >
                  <User size={20} /> My Dashboard
                </Link>
                <form action={`${BASE_PATH}/api/users/logout`} method="POST">
                  <button type="submit" className="text-lg font-medium text-red-500 hover:text-red-700 py-2 text-left w-full">
                    Logout
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link 
                  href="/login" 
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-gray-800 hover:text-[#5e3fde] py-2 flex items-center gap-2"
                >
                  <LogIn size={20} /> Login
                </Link>
              </div>
            )}
            
            <div className="mt-8">
              <Link 
                href="#on-demand" 
                onClick={() => setIsOpen(false)}
                className="theme-btn theme-btn-primary w-full text-center block"
              >
                <span>On Demand Classes</span><span className="btn-icon">↗</span>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
