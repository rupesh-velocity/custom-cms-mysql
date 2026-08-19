'use client';

import { User, Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BASE_PATH } from '@/lib/config';

export default function Header() {
  const router = useRouter();
  const [userName, setUserName] = useState('Admin User');

  useEffect(() => {
    fetch(`${BASE_PATH}/api/auth/me`)
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          const name = data.user.firstName 
            ? `${data.user.firstName} ${data.user.lastName || ''}`.trim() 
            : data.user.username;
          if (name) setUserName(name);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch(`${BASE_PATH}/api/auth/logout`, { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8">
      <div className="font-medium text-gray-700">Admin Panel</div>
      <div className="flex items-center gap-4 text-gray-500">
        <button className="hover:text-gray-900"><Bell size={20} /></button>
        <div className="flex items-center gap-4 border-l pl-4 border-gray-300">
          <div className="flex items-center gap-2">
            <User size={20} />
            <span className="text-sm font-medium">{userName}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
