'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FormNav({ formId, title }: { formId: string | number, title: string }) {
  const pathname = usePathname() || '';
  
  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 h-14">
          <span className="font-semibold text-gray-900 border-r border-gray-200 pr-6">{title}</span>
          
          <nav className="flex space-x-1">
            <Link 
              href={`/admin/forms/${formId}/edit`}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                pathname === `/admin/forms/${formId}/edit` 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Fields
            </Link>
            
            <Link 
              href={`/admin/forms/${formId}/settings`}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                pathname === `/admin/forms/${formId}/settings` 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Settings
            </Link>
            
            <Link 
              href={`/admin/forms/${formId}/settings/confirmations`}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                pathname === `/admin/forms/${formId}/settings/confirmations` 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Confirmations
            </Link>
            
            <Link 
              href={`/admin/forms/${formId}/settings/notifications`}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                pathname === `/admin/forms/${formId}/settings/notifications` 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Notifications
            </Link>
            
          </nav>
        </div>
      </div>
    </div>
  );
}
