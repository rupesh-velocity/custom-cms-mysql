import Link from 'next/link';
import { Plus, Shield, Upload, User as UserIcon } from 'lucide-react';
import UserActions from '@/components/UserActions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SearchParams = {
  role?: string | string[];
};

const roleTabs = [
  { label: 'All', value: '' },
  { label: 'Administrators', value: 'Administrator' },
  { label: 'Subscribers', value: 'Subscriber' },
  { label: 'Customers', value: 'Customer' },
];

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const roleParam = Array.isArray(params?.role) ? params?.role[0] : params?.role;

  const allowedRoles = roleTabs.map((tab) => tab.value).filter(Boolean);
  const selectedRole = roleParam && allowedRoles.includes(roleParam) ? roleParam : '';

  const where = selectedRole ? { role: selectedRole } : {};

  const [users, candidateUsers, totalCount, administratorCount, subscriberCount, customerCount] =
    await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              posts: true,
              pages: true,
              createdCourses: true,
              createdProducts: true,
              forms: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'Administrator' } }),
      prisma.user.count({ where: { role: 'Subscriber' } }),
      prisma.user.count({ where: { role: 'Customer' } }),
    ]);

  const roleCounts: Record<string, number> = {
    '': totalCount,
    Administrator: administratorCount,
    Subscriber: subscriberCount,
    Customer: customerCount,
  };

  const candidates = candidateUsers.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  }));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/users/import"
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Upload size={18} />
            Import Subscribers
          </Link>

          <Link
            href="/admin/users/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={18} />
            Add New
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        {roleTabs.map((tab, index) => {
          const isActive = selectedRole === tab.value;
          const href = tab.value ? `/admin/users?role=${encodeURIComponent(tab.value)}` : '/admin/users';

          return (
            <span key={tab.value || 'all'} className="flex items-center gap-2">
              {index > 0 && <span className="text-gray-300">|</span>}

              <Link
                href={href}
                className={`transition-colors ${
                  isActive
                    ? 'font-semibold text-gray-950'
                    : 'text-[#5e3fde] hover:text-[#4c32c4]'
                }`}
              >
                {tab.label} ({roleCounts[tab.value] || 0})
              </Link>
            </span>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {selectedRole ? `No ${selectedRole} users found.` : 'No users found. Create one!'}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-500">Username</th>
                <th className="px-6 py-4 font-medium text-gray-500">Name</th>
                <th className="px-6 py-4 font-medium text-gray-500">Email</th>
                <th className="px-6 py-4 font-medium text-gray-500">Role</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-gray-50">
                  <td className="flex items-center gap-2 px-6 py-4 font-medium text-gray-900">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                      <UserIcon size={16} />
                    </div>
                    {user.username}
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {user.firstName || user.lastName ? (
                      `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    ) : (
                      <span className="italic text-gray-400">N/A</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-gray-700">{user.email}</td>

                  <td className="px-6 py-4">
                    <span className="flex w-fit items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">
                      {user.role === 'Administrator' && <Shield size={14} className="text-purple-600" />}
                      {user.role}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <UserActions
                      user={{
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                      }}
                      candidates={candidates}
                      counts={{
                        pages: user._count.pages,
                        posts: user._count.posts,
                        courses: user._count.createdCourses,
                        products: user._count.createdProducts,
                        forms: user._count.forms,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
