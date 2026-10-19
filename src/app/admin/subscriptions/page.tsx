import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Repeat2, ExternalLink } from 'lucide-react';
import SubscriptionActions from '@/components/SubscriptionActions';

export const dynamic = 'force-dynamic';

function formatDate(date?: Date | string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString();
}

function isExpired(date?: Date | string | null) {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
}

function isStripeActive(status?: string | null) {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'ACTIVE' || normalized === 'TRIALING';
}

function accessStatusClass(accessExpired: boolean, syncRequired: boolean) {
  if (syncRequired) return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  if (accessExpired) return 'bg-red-100 text-red-700 ring-1 ring-red-200';
  return 'bg-green-100 text-green-700 ring-1 ring-green-200';
}

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const q = (params.q || '').trim();
  const status = (params.status || '').trim();

  const subscriptions = await prisma.courseSubscription.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { stripeSubscriptionId: { contains: q } },
              { user: { email: { contains: q } } },
              { user: { firstName: { contains: q } } },
              { user: { lastName: { contains: q } } },
              { course: { title: { contains: q } } },
            ],
          }
        : {}),
    },
    include: {
      user: true,
      course: {
        include: {
          userAccess: true,
        },
      },
      courseAccessPlan: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const counts = await prisma.courseSubscription.groupBy({
    by: ['status'],
    _count: { status: true },
  });
  const totalCount = counts.reduce((sum, item) => sum + item._count.status, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1.5">Manage Stripe auto-renew course subscriptions separately from order history.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <form className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search customer, course, or Stripe ID"
            className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#5e3fde] focus:ring-2 focus:ring-[#5e3fde]/10 lg:max-w-md"
          />

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:ml-auto lg:w-auto">
            <select
              name="status"
              defaultValue={status}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-[#5e3fde] focus:ring-2 focus:ring-[#5e3fde]/10 sm:w-56"
            >
              <option value="">All statuses ({totalCount})</option>
              {counts.map((item) => (
                <option key={item.status} value={item.status}>{item.status} ({item._count.status})</option>
              ))}
            </select>
            <button className="h-11 rounded-xl bg-[#5e3fde] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#4b2fd6]">Filter</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {subscriptions.length === 0 ? (
          <div className="py-16 text-center">
            <Repeat2 size={38} className="text-gray-300 mx-auto" />
            <h2 className="text-base font-semibold text-gray-900 mt-4">No subscriptions found</h2>
            <p className="text-sm text-gray-500 mt-1">Auto-renew course subscriptions will appear here after checkout.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50/40 border-b border-gray-100">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Course / Plan</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Access / Subscription</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Renewal</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stripe ID</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.map((sub) => {
                  const user = sub.user;
                  const course = sub.course;
                  const customerName = user
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || `User #${sub.userId}`
                    : `Missing user #${sub.userId}`;
                  const customerEmail = user?.email || '';
                  const courseTitle = course?.title || `Missing course #${sub.courseId}`;
                  const planName = sub.courseAccessPlan?.name || 'Course Access';
                  const access = course?.userAccess?.find((record) => record.userId === sub.userId);
                  const stripeActive = isStripeActive(sub.status);
                  const activeAutoRenew = stripeActive && !sub.cancelAtPeriodEnd;

                  // Active auto-renew must use Stripe subscription period as the source of truth.
                  // This prevents an old UserCourseAccess.expiresAt value from showing
                  // "Access expired" while Stripe subscription is still ACTIVE.
                  const accessEnd = activeAutoRenew
                    ? sub.currentPeriodEnd
                    : access?.expiresAt || sub.currentPeriodEnd;

                  const accessExpired = activeAutoRenew ? false : isExpired(accessEnd);
                  const needsSync = false;
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{customerName}</div>
                        {customerEmail ? (
                          <a href={`mailto:${customerEmail}`} className="text-xs text-[#5e3fde] hover:underline">{customerEmail}</a>
                        ) : (
                          <div className="text-xs text-red-500">Linked user record is missing</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{courseTitle}</div>
                        <div className="text-xs text-gray-500">{planName}</div>
                        {!course ? (
                          <div className="mt-1 text-xs text-red-500">Linked course record is missing</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        {(() => {
                          return (
                            <div className="space-y-1.5">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${accessStatusClass(accessExpired, needsSync)}`}>
                                {activeAutoRenew ? 'Access active' : accessExpired ? 'Access expired' : 'Access active'}
                              </span>

                              {activeAutoRenew ? (
                                <div className="text-xs font-medium text-green-700">Auto-renew enabled</div>
                              ) : null}

                              {sub.cancelAtPeriodEnd && !accessExpired ? (
                                <div className="text-xs font-medium text-amber-600">Auto-renew cancelled after this period</div>
                              ) : null}

                              {sub.cancelAtPeriodEnd && accessExpired ? (
                                <div className="text-xs font-medium text-amber-600">Auto-renew ended</div>
                              ) : null}

                              <div className={`text-xs font-semibold ${accessExpired ? 'text-red-600' : 'text-green-700'}`}>
                                {activeAutoRenew
                                  ? `Next renewal ${formatDate(sub.currentPeriodEnd)}`
                                  : accessExpired
                                    ? `Expired on ${formatDate(accessEnd)}`
                                    : `Access until ${formatDate(accessEnd)}`}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-4 text-gray-700">{formatDate(sub.currentPeriodEnd)}</td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-500 max-w-[220px] truncate">{sub.stripeSubscriptionId}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end gap-3">
                          <div className="flex justify-end gap-3">
                            {user ? (
                              <Link href={`/admin/users/${sub.userId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5e3fde] hover:underline"><ExternalLink size={14} /> User</Link>
                            ) : null}
                          </div>
                          <SubscriptionActions
                            subscriptionId={sub.id}
                            status={sub.status}
                            cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
                            variant="admin"
                            canSync={needsSync}
                            accessExpired={accessExpired}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
