import Link from 'next/link';
import UserImportForm from '@/components/UserImportForm';

export const dynamic = 'force-dynamic';

export default function ImportUsersPage() {
  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import Subscribers</h1>
          <p className="text-gray-500 mt-2">Bulk create basic Subscriber accounts from a CSV file.</p>
        </div>
        <Link href="/admin/users" className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Back to Users
        </Link>
      </div>
      <UserImportForm />
    </div>
  );
}
