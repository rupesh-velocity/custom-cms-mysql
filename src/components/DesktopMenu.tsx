'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';

function isNodeActive(node: any, path: string): boolean {
  // Exact match for home
  if (node.url === '/') return path === '/';
  
  // Match path startsWith URL (ignoring empty or # links)
  if (node.url && node.url !== '#' && path.startsWith(node.url)) return true;
  
  // If this node has children (like a custom link "#" for Services), check if any of the children are active (recursive)
  if (node.children && node.children.length > 0) {
    return node.children.some((child: any) => isNodeActive(child, path));
  }
  
  return false;
}

// Recursive component for rendering menu items
function MenuNode({ node, depth = 0, pathname }: { node: any, depth?: number, pathname: string }) {
  const hasChildren = node.children && node.children.length > 0;
  
  // Calculates true if the item itself OR any of its children are the active page
  const isActive = isNodeActive(node, pathname);
  
  // We output ONLY the standard WordPress-style classes, removing inline active/hover colors
  const activeLiClass = isActive ? 'current-menu-item current-menu-ancestor' : '';

  if (!hasChildren) {
    if (depth === 0) {
      return (
        <li id={`menu-item-${node.id}`} className={`menu-item ${activeLiClass}`}>
          <Link href={node.url}>
            {node.label}
          </Link>
        </li>
      );
    }
    return (
      <li id={`menu-item-${node.id}`} className={`menu-item ${activeLiClass}`}>
        <Link href={node.url} className="block px-4 py-2 text-sm">
          {node.label}
        </Link>
      </li>
    );
  }

  // Dropdown node
  if (depth === 0) {
    return (
      <li id={`menu-item-${node.id}`} className={`menu-item menu-item-has-children relative group flex items-center cursor-pointer ${activeLiClass}`}>
        <Link href={node.url} className="flex items-center gap-1">
          {node.label}
          <ChevronDown size={14} className="opacity-70 transition-transform" />
        </Link>
        
        <div className="absolute top-full left-0 pt-2 hidden group-hover:block min-w-[200px] z-50">
          <ul className="sub-menu bg-white border border-gray-100 shadow-xl rounded-lg py-2 m-0 p-0">
            {node.children.map((child: any) => (
              <MenuNode key={child.id} node={child} depth={depth + 1} pathname={pathname} />
            ))}
          </ul>
        </div>
      </li>
    );
  }

  return (
    <li id={`menu-item-${node.id}`} className={`menu-item menu-item-has-children relative group cursor-pointer ${activeLiClass}`}>
      <Link href={node.url} className="flex items-center gap-1 justify-between px-4 py-2 text-sm">
        {node.label}
        <ChevronDown size={14} className="opacity-70 -rotate-90" />
      </Link>
      
      <div className="absolute top-0 left-full ml-1 hidden group-hover:block min-w-[200px] z-50">
        <div className="absolute -left-1 w-1 top-0 bottom-0"></div>
        <ul className="sub-menu bg-white border border-gray-100 shadow-xl rounded-lg py-2 m-0 p-0">
          {node.children.map((child: any) => (
            <MenuNode key={child.id} node={child} depth={depth + 1} pathname={pathname} />
          ))}
        </ul>
      </div>
    </li>
  );
}

export default function DesktopMenu({ menuTree, primaryMenu }: { menuTree: any[], primaryMenu: any }) {
  const pathname = usePathname() || '';

  return (
    <nav className="main-menu hidden lg:flex items-center gap-10">
      <ul id="primary-menu" className="theme-main-menu flex items-center gap-10 m-0 p-0">
        {menuTree.map((node: any) => (
          <MenuNode key={node.id} node={node} pathname={pathname} />
        ))}
      </ul>
      {!primaryMenu?.items?.length && (
        <div className="text-sm text-gray-400 italic">
          Create a menu to add links
        </div>
      )}
    </nav>
  );
}
