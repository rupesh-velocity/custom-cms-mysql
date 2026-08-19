'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import UserForm from '@/components/UserForm';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    
    fetch(`${BASE_PATH}/api/users/${params?.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          toast.error('User not found');
          router.push('/admin/users');
          return;
        }
        setUserData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [params?.id, router]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading user...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
        <p className="text-gray-500 mt-2">Update user details or change their role.</p>
      </div>
      <UserForm initialData={userData} isEdit={true} />
    </div>
  );
}
