import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import FormSwitcher from './FormSwitcher';
import { handleBulkAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AllEntriesPage({ searchParams }: { searchParams: Promise<{ form_id?: string, status?: string }> }) {
  const params = await searchParams;
  const statusFilter = params.status || 'All';
  
  // Fetch all forms for the switcher
  const forms = await prisma.form.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, fields: true }
  });

  if (forms.length === 0) {
    return (
      <div className="max-w-[1200px]">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Form Entries</h1>
        <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 mb-4">No forms found. Create a form first to see entries.</p>
          <Link href="/admin/forms/new" className="bg-[#5e3fde] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4b32b2] transition-colors">
            Create Form
          </Link>
        </div>
      </div>
    );
  }

  // Determine active form
  let activeForm = forms[0];
  if (params.form_id) {
    const found = forms.find(f => f.id === parseInt(params.form_id!));
    if (found) activeForm = found;
  } else {
    redirect(`/admin/forms/entries?form_id=${activeForm.id}`);
  }

  // Parse fields to get columns
  let fields: any[] = [];
  try {
    fields = JSON.parse(activeForm.fields || '[]');
  } catch (e) {}

  const [allCount, unreadCount, starredCount, spamCount, trashCount] = await Promise.all([
    prisma.formSubmission.count({ where: { formId: activeForm.id, status: 'Active' } }),
    prisma.formSubmission.count({ where: { formId: activeForm.id, status: 'Active', isRead: false } }),
    prisma.formSubmission.count({ where: { formId: activeForm.id, isStarred: true } }),
    prisma.formSubmission.count({ where: { formId: activeForm.id, status: 'Spam' } }),
    prisma.formSubmission.count({ where: { formId: activeForm.id, status: 'Trash' } }),
  ]);

  let whereClause: any = { formId: activeForm.id };
  if (statusFilter === 'Unread') whereClause = { ...whereClause, status: 'Active', isRead: false };
  else if (statusFilter === 'Starred') whereClause = { ...whereClause, isStarred: true };
  else if (statusFilter === 'Spam') whereClause = { ...whereClause, status: 'Spam' };
  else if (statusFilter === 'Trash') whereClause = { ...whereClause, status: 'Trash' };
  else whereClause = { ...whereClause, status: 'Active' };

  // Fetch submissions for active form
  const submissions = await prisma.formSubmission.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });

  const boundBulkAction = handleBulkAction.bind(null, activeForm.id, statusFilter);

  return (
    <div className="max-w-[1200px]">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Entries</h1>
          <p className="text-sm text-gray-500">View and manage form submissions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Select Form:</label>
          <div className="relative">
            <FormSwitcher forms={forms} activeFormId={activeForm.id} status={statusFilter} />
          </div>
          <a 
            href={`/api/forms/${activeForm.id}/export`}
            download
            className="ml-4 bg-[#5e3fde] !text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4b32b2] transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </a>
        </div>
      </div>

      <div className="flex text-[14px] mb-4 text-[#50575e]">
        <Link href={`/admin/forms/entries?form_id=${activeForm.id}&status=All`} className={statusFilter === 'All' ? 'font-semibold text-gray-900' : 'text-[#5e3fde] hover:underline'}>All <span className="text-gray-500 font-normal">({allCount})</span></Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href={`/admin/forms/entries?form_id=${activeForm.id}&status=Spam`} className={statusFilter === 'Spam' ? 'font-semibold text-gray-900' : 'text-[#5e3fde] hover:underline'}>Spam <span className="text-gray-500 font-normal">({spamCount})</span></Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href={`/admin/forms/entries?form_id=${activeForm.id}&status=Trash`} className={statusFilter === 'Trash' ? 'font-semibold text-gray-900' : 'text-[#5e3fde] hover:underline'}>Trash <span className="text-gray-500 font-normal">({trashCount})</span></Link>
      </div>
      
      <form action={boundBulkAction} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <select name="action" className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none text-sm bg-white text-gray-700">
              <option value="">Bulk actions</option>
              <option value="Trash">Trash</option>
              <option value="Spam">Mark as Spam</option>
              <option value="Restore">Restore</option>
              <option value="Delete">Delete Permanently</option>
            </select>
            <button type="submit" className="bg-white border border-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors font-medium">
              Apply
            </button>
          </div>
          <div className="text-sm text-gray-500">{submissions.length} items</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white">
              <tr className="border-b border-gray-100">
                <th className="py-3 px-4 text-xs font-semibold text-[#0071a1] w-12 text-center">
                  <input type="checkbox" className="rounded border-gray-300 text-[#5e3fde] focus:ring-[#5e3fde]" />
                </th>
                {fields.slice(0, 2).map((field, index) => (
                  <th key={field.id} className="py-3 px-4 text-xs font-semibold text-[#0071a1] whitespace-nowrap">
                    {field.label}
                  </th>
                ))}
                <th className="py-3 px-4 text-xs font-semibold text-[#0071a1] whitespace-nowrap">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map(sub => {
                let parsedData: Record<string, any> = {};
                try { parsedData = JSON.parse(sub.data); } catch(e) {}
                
                return (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors group bg-white">
                    <td className="py-4 px-4 text-center align-top">
                      <input type="checkbox" name="submissionIds" value={sub.id} className="rounded border-gray-300 text-[#5e3fde] focus:ring-[#5e3fde]" />
                    </td>
                    {fields.slice(0, 2).map((field, index) => {
                      const value = parsedData[field.id] ? (Array.isArray(parsedData[field.id]) ? parsedData[field.id].join(', ') : String(parsedData[field.id])) : '';
                      return (
                        <td key={field.id} className="py-4 px-4 text-sm text-gray-900 align-top">
                          <div className={index === 0 ? "font-medium" : ""}>
                            {value || '-'}
                          </div>
                          {index === 0 && (
                            <div className="text-[12px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 whitespace-nowrap">
                              <Link href={`/admin/forms/entries/${sub.id}`} className="text-[#0071a1] hover:text-[#005a82]">View</Link>
                              
                              {sub.status === 'Active' && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <Link href={`/admin/forms/entries/${sub.id}`} className="text-[#0071a1] hover:text-[#005a82]">Edit</Link>
                                  <span className="text-gray-300">|</span>
                                  <button className="text-[#0071a1] hover:text-[#005a82]">Mark read</button>
                                  <span className="text-gray-300">|</span>
                                  <button formAction={async () => {
                                    'use server';
                                    await prisma.formSubmission.update({ where: { id: sub.id }, data: { status: 'Spam' } });
                                    redirect(`/admin/forms/entries?form_id=${activeForm.id}&status=${statusFilter}`);
                                  }} className="text-[#b32d2e] hover:text-[#8a2425]">
                                    Mark as Spam
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button formAction={async () => {
                                    'use server';
                                    await prisma.formSubmission.update({ where: { id: sub.id }, data: { status: 'Trash' } });
                                    redirect(`/admin/forms/entries?form_id=${activeForm.id}&status=${statusFilter}`);
                                  }} className="text-[#b32d2e] hover:text-[#8a2425]">
                                    Trash
                                  </button>
                                </>
                              )}

                              {sub.status === 'Spam' && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <button formAction={async () => {
                                    'use server';
                                    await prisma.formSubmission.update({ where: { id: sub.id }, data: { status: 'Active' } });
                                    redirect(`/admin/forms/entries?form_id=${activeForm.id}&status=${statusFilter}`);
                                  }} className="text-[#0071a1] hover:text-[#005a82]">
                                    Not Spam
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button formAction={async () => {
                                    'use server';
                                    await prisma.formSubmission.delete({ where: { id: sub.id } });
                                    redirect(`/admin/forms/entries?form_id=${activeForm.id}&status=${statusFilter}`);
                                  }} className="text-[#b32d2e] hover:text-[#8a2425]">
                                    Delete Permanently
                                  </button>
                                </>
                              )}

                              {sub.status === 'Trash' && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <button formAction={async () => {
                                    'use server';
                                    await prisma.formSubmission.update({ where: { id: sub.id }, data: { status: 'Active' } });
                                    redirect(`/admin/forms/entries?form_id=${activeForm.id}&status=${statusFilter}`);
                                  }} className="text-[#0071a1] hover:text-[#005a82]">
                                    Restore
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button formAction={async () => {
                                    'use server';
                                    await prisma.formSubmission.delete({ where: { id: sub.id } });
                                    redirect(`/admin/forms/entries?form_id=${activeForm.id}&status=${statusFilter}`);
                                  }} className="text-[#b32d2e] hover:text-[#8a2425]">
                                    Delete Permanently
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-4 px-4 text-sm text-gray-500 whitespace-nowrap align-top">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={fields.length + 2} className="py-12 text-center text-gray-500">
                    No submissions found for this form.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}
