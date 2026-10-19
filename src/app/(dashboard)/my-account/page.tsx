import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SubscriptionActions from '@/components/SubscriptionActions';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export const dynamic = 'force-dynamic';

type AccountTab = 'dashboard' | 'courses' | 'subscriptions' | 'payments' | 'profile' | 'password';

const ACCOUNT_TABS: { key: AccountTab; label: string; href: string }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/my-account' },
  { key: 'courses', label: 'My Courses', href: '/my-account?tab=courses' },
  { key: 'subscriptions', label: 'Subscriptions', href: '/my-account?tab=subscriptions' },
  { key: 'payments', label: 'Payments', href: '/my-account?tab=payments' },
  { key: 'profile', label: 'Profile', href: '/my-account?tab=profile' },
  { key: 'password', label: 'Password', href: '/my-account?tab=password' },
];

function normalizeTab(value?: string | string[] | null): AccountTab {
  const tab = Array.isArray(value) ? value[0] : value;
  if (tab === 'courses' || tab === 'subscriptions' || tab === 'payments' || tab === 'profile' || tab === 'password') return tab;
  return 'dashboard';
}

function isExpiredAccess(expiresAt?: Date | string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function daysUntil(date?: Date | string | null) {
  if (!date) return null;
  const end = new Date(date);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  end.setHours(23, 59, 59, 999);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isExpiringSoon(expiresAt?: Date | string | null) {
  const days = daysUntil(expiresAt);
  return days !== null && days >= 0 && days <= 15;
}

function formatDate(date?: Date | string | null) {
  if (!date) return 'Lifetime';
  return new Date(date).toLocaleDateString();
}

function formatDateTime(date?: Date | string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString();
}

function formatCurrency(amount?: number | string | null, currency = 'USD') {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(value);
  } catch {
    return `${currency || 'USD'} ${value.toFixed(2)}`;
  }
}

function getCoursePageHref(course?: { slug?: string | null } | null) {
  return course?.slug ? `/courses/${course.slug}` : '/courses/on-demand-fitness-class-videos';
}

function subscriptionIsActive(subscription: any) {
  const status = String(subscription?.status || '').toUpperCase();
  return status === 'ACTIVE' || status === 'TRIALING' || status === 'PAST_DUE' || status === 'UNPAID';
}

function getTimeValue(date?: Date | string | null) {
  if (!date) return 0;
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function chooseBestSubscription(existing: any, candidate: any) {
  if (!existing) return candidate;
  const existingActive = subscriptionIsActive(existing);
  const candidateActive = subscriptionIsActive(candidate);

  if (candidateActive && !existingActive) return candidate;
  if (!candidateActive && existingActive) return existing;

  const existingAutoRenewOn = existingActive && !existing.cancelAtPeriodEnd;
  const candidateAutoRenewOn = candidateActive && !candidate.cancelAtPeriodEnd;

  if (candidateAutoRenewOn && !existingAutoRenewOn) return candidate;
  if (!candidateAutoRenewOn && existingAutoRenewOn) return existing;

  const existingEnd = getTimeValue(existing.currentPeriodEnd);
  const candidateEnd = getTimeValue(candidate.currentPeriodEnd);
  if (candidateEnd !== existingEnd) return candidateEnd > existingEnd ? candidate : existing;

  return getTimeValue(candidate.updatedAt) > getTimeValue(existing.updatedAt) ? candidate : existing;
}

function getAccessState(record: any, subscription?: any) {
  const hasActiveSubscription = subscription && subscriptionIsActive(subscription);
  const autoRenewOn = Boolean(hasActiveSubscription && !subscription.cancelAtPeriodEnd);
  const autoRenewCancelled = Boolean(hasActiveSubscription && subscription.cancelAtPeriodEnd);
  const accessEnd = hasActiveSubscription && subscription?.currentPeriodEnd ? subscription.currentPeriodEnd : record?.expiresAt;

  // Active auto-renew must control access status, even when UserCourseAccess.expiresAt is old.
  const expired = autoRenewOn ? false : isExpiredAccess(accessEnd);
  const expiringSoon = !autoRenewOn && !expired && isExpiringSoon(accessEnd);

  return { autoRenewOn, autoRenewCancelled, accessEnd, expired, expiringSoon };
}

function statusBadgeClass(status?: string | null) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'TRIALING' || normalized === 'COMPLETED' || normalized === 'PROCESSING') {
    return 'bg-green-50 text-green-700 ring-green-200';
  }
  if (normalized === 'PENDING' || normalized === 'PAST_DUE' || normalized === 'UNPAID') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (normalized === 'CANCELED' || normalized === 'CANCELLED' || normalized === 'FAILED' || normalized === 'EXPIRED') return 'bg-red-50 text-red-700 ring-red-200';
  return 'bg-gray-100 text-gray-700 ring-gray-200';
}

function getOrderItemAmount(order: any, courseId?: number | null) {
  const item = order?.items?.find((orderItem: any) => !courseId || orderItem.courseId === courseId);
  if (!item) return null;
  return Number(item.total ?? item.price ?? 0);
}

function getAccessPlanAmount(record: any, subscription?: any) {
  const plan = record?.courseAccessPlan || subscription?.courseAccessPlan;
  if (!plan) return null;
  return Number(plan.salePrice ?? plan.regularPrice ?? 0);
}

function getBillingCycle(plan: any, subscription?: any) {
  if (!plan && !subscription) return '—';
  const name = String(plan?.name || '').toLowerCase();
  if (name.includes('$1') || name.includes('daily') || name.includes('day')) return 'Daily';
  const months = Number(plan?.durationMonths || 0);
  if (months === 1) return 'Monthly';
  if (months > 1) return `Every ${months} months`;
  if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
    const start = new Date(subscription.currentPeriodStart).getTime();
    const end = new Date(subscription.currentPeriodEnd).getTime();
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (days <= 1) return 'Daily';
    if (days > 1 && days < 45) return `Every ${days} days`;
  }
  return 'Auto-renew';
}

async function getCurrentAccountUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('cms_session')?.value;

  if (!token) {
    redirect('/login?redirect=/my-account');
    throw new Error('Redirecting');
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production');
    const { payload } = await jwtVerify(token, secret);
    const userId = Number(payload.id);
    if (!userId) throw new Error('Invalid user');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    return { userId, user };
  } catch {
    redirect('/login?redirect=/my-account');
    throw new Error('Redirecting');
  }
}

function AccountTabs({ activeTab }: { activeTab: AccountTab }) {
  return (
    <nav className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm" style={{ marginTop: '24px', marginBottom: '34px' }}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {ACCOUNT_TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`inline-flex min-h-[48px] items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-bold transition ${
                active ? 'bg-[#5e3fde] text-white shadow-lg shadow-[#5e3fde]/20' : 'text-gray-700 hover:bg-[#5e3fde]/5 hover:text-[#5e3fde]'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}



function PageSection({ title, description, eyebrow }: { title: string; description?: string; eyebrow?: string }) {
  return (
    <div className="mb-10 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm md:flex md:items-center md:justify-between md:px-7">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5e3fde]">{eyebrow}</p> : null}
        <h3 className="font-heading text-3xl font-bold leading-tight text-gray-950">{title}</h3>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: number | string; helper: string }) {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#5e3fde]/30 hover:shadow-lg hover:shadow-slate-200/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <div className="mt-4 font-heading text-4xl font-bold leading-none text-slate-950">{value}</div>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#5e3fde]/10 text-[#5e3fde] transition group-hover:bg-[#5e3fde] group-hover:text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function DetailItem({ label, value, className = '' }: { label: string; value: any; className?: string }) {
  return (
    <div className={`rounded-2xl bg-gray-50 px-5 py-4 ${className}`}>
      <span className="block text-xs font-bold uppercase tracking-[0.14em] text-gray-400">{label}</span>
      <strong className="mt-1 block break-words text-sm text-gray-950">{value || '—'}</strong>
    </div>
  );
}


function CourseMetaCell({ label, value }: { label: string; value: any }) {
  return (
    <div className="min-w-0">
      <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">{label}</span>
      <strong className="mt-1 block truncate text-sm text-gray-950">{value || '—'}</strong>
    </div>
  );
}

function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
      <h3 className="font-heading text-2xl font-bold text-gray-950">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-6 inline-flex rounded-xl bg-[#5e3fde] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5e3fde]/20 transition hover:bg-[#4c32c4]">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function CourseIcon({ image, title }: { image?: string | null; title: string }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#5e3fde]/10 text-[#5e3fde]">
      {image ? (
        <img src={image} alt={title} className="h-full w-full object-cover" />
      ) : (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      )}
    </div>
  );
}

export default async function MyAccountPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> }) {
  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : {};
  const activeTab = normalizeTab(resolvedSearchParams?.tab);
  const { userId, user } = await getCurrentAccountUser();

  const [accessRecords, subscriptions, orders] = await Promise.all([
    prisma.userCourseAccess.findMany({
      where: { userId },
      include: { course: true, courseAccessPlan: true, order: { include: { items: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.courseSubscription.findMany({
      where: { userId },
      include: { course: true, courseAccessPlan: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { customerId: userId },
          { customerEmail: user.email },
        ],
      },
      include: { items: { include: { course: true, courseAccessPlan: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const findSubscriptionOrder = (subscription: any) => orders.find((order: any) => {
    if (order.paymentId && subscription.latestPaymentIntentId && order.paymentId === subscription.latestPaymentIntentId) return true;
    return order.items?.some((item: any) => item.courseId === subscription.courseId && item.courseAccessPlanId === subscription.courseAccessPlanId);
  }) || null;

  const subscriptionsByCourseId = new Map<number, any>();
  subscriptions.forEach((subscription: any) => {
    const existing = subscriptionsByCourseId.get(subscription.courseId);
    subscriptionsByCourseId.set(subscription.courseId, chooseBestSubscription(existing, subscription));
  });

  const accessItems = accessRecords.map((record: any) => {
    const subscription = subscriptionsByCourseId.get(record.courseId);
    return { record, subscription, state: getAccessState(record, subscription) };
  });

  const activeSubscriptions = subscriptions.filter(subscriptionIsActive);
  const activeAutoRenewSubscriptions = activeSubscriptions.filter((subscription: any) => !subscription.cancelAtPeriodEnd);
  const endingSubscriptions = activeSubscriptions.filter((subscription: any) => subscription.cancelAtPeriodEnd);
  const activeAccessRecords = accessItems.filter((item: any) => !item.state.expired).map((item: any) => item.record);
  const expiredAccessRecords = accessItems.filter((item: any) => item.state.expired).map((item: any) => item.record);
  const latestAccessItem = accessItems.find((item: any) => !item.state.expired) || accessItems[0] || null;
  const latestAccess = latestAccessItem?.record || null;
  const latestOrder = orders[0];
  const nextRenewal = activeAutoRenewSubscriptions
    .filter((subscription: any) => subscription.currentPeriodEnd)
    .sort((a: any, b: any) => getTimeValue(a.currentPeriodEnd) - getTimeValue(b.currentPeriodEnd))[0];
  const endingSubscription = endingSubscriptions
    .filter((subscription: any) => subscription.currentPeriodEnd)
    .sort((a: any, b: any) => getTimeValue(a.currentPeriodEnd) - getTimeValue(b.currentPeriodEnd))[0];

  // Reminder/expired notices are only for one-time access or cancelled auto-renew access.
  // Active auto-renew users must not see expired/reminder notices even if UserCourseAccess.expiresAt is old.
  const reminderAccessItems = accessItems.filter((item: any) => !item.state.autoRenewOn);
  const expiringOneTimeAccessItems = reminderAccessItems
    .filter((item: any) => item.state.expiringSoon)
    .sort((a: any, b: any) => getTimeValue(a.state.accessEnd) - getTimeValue(b.state.accessEnd));
  const expiredOneTimeAccessItems = reminderAccessItems
    .filter((item: any) => item.state.expired)
    .sort((a: any, b: any) => getTimeValue(b.state.accessEnd) - getTimeValue(a.state.accessEnd));
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email;
  const firstName = user.firstName || user.username || 'there';

  return (
    <div className="fa-account-page bg-[#f6f8fb] font-body text-body">

      <style dangerouslySetInnerHTML={{ __html: `
        .fa-account-page {
          min-height: calc(100vh - 138px);
          --fa-purple: #5e3fde;
          --fa-purple-dark: #4c32c4;
          --fa-blue: #5e3fde;
          --fa-text: #111827;
          --fa-muted: #64748b;
          --fa-border: #e7ecf3;
          --fa-soft: #f7f8fb;
          background: var(--fa-soft);
        }
        .fa-account-page main { min-height: calc(100vh - 174px); padding-top: 34px; padding-bottom: 56px; }
        .fa-account-page .container { max-width: 1170px; }
        .fa-account-page .rounded-3xl,
        .fa-account-page .rounded-2xl {
          border-color: var(--fa-border) !important;
        }
        .fa-account-page .shadow-sm {
          box-shadow: 0 14px 35px rgba(15, 23, 42, 0.055) !important;
        }
        .fa-account-page h2,
        .fa-account-page h3,
        .fa-account-page h4 {
          letter-spacing: -0.025em;
        }
        .fa-account-page [class*="hover\\:border"],
        .fa-account-page [class*="hover\\:shadow"] {
          transition: all .2s ease;
        }
        .fa-dashboard-welcome {
          background: #ffffff !important;
          border: 1px solid var(--fa-border) !important;
          border-radius: 26px !important;
          box-shadow: 0 16px 45px rgba(15, 23, 42, 0.06) !important;
        }
        .fa-dashboard-welcome .fa-welcome-strip {
          height: 5px;
          width: 100%;
          background: var(--fa-blue);
        }
        .fa-dashboard-welcome p:first-child { color: var(--fa-purple) !important; }
        .fa-account-page a[href*="tab=courses"].inline-flex,
        .fa-account-page a[href*="tab=payments"].inline-flex,
        .fa-account-page a[href*="/courses/"].inline-flex,
        .fa-account-page a[href*="/checkout"].inline-flex {
          border-radius: 12px !important;
        }
        .fa-account-page .grid > .group,
        .fa-account-page .grid > .rounded-3xl,
        .fa-account-page .space-y-5 > .rounded-3xl,
        .fa-account-page .overflow-hidden.rounded-3xl {
          background: #ffffff !important;
          border: 1px solid var(--fa-border) !important;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05) !important;
        }
        .fa-account-page .grid > .group:hover {
          transform: translateY(-2px);
          border-color: rgba(94, 63, 222, 0.22) !important;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08) !important;
        }
        .fa-account-page .bg-gray-50 {
          background-color: #f8fafc !important;
        }
        .fa-account-page .text-\[\#5e3fde\],
        .fa-account-page .text-amber-700,
        .fa-account-page .text-red-700 {
          opacity: .98;
        }
        .fa-account-footer {
          background: #161A29;
          color: #ffffff;
          text-align: center;
          padding: 18px 16px;
          font-size: 14px;
          font-weight: 600;
          margin-top: 0;
        }
        .fa-account-avatar { width: 56px !important; min-width: 56px !important; height: 56px !important; }
        @media (max-width: 767px) {
          .fa-account-page main { padding-top: 22px; padding-bottom: 32px; }
          .fa-account-page .container { max-width: 100%; }
          .fa-mobile-section-heading {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .fa-mobile-section-heading a {
            align-self: flex-start !important;
          }
          .fa-dashboard-latest-card {
            flex-direction: column !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
          }
          .fa-dashboard-latest-card > div:first-child {
            align-items: flex-start !important;
            width: 100% !important;
          }
          .fa-dashboard-latest-card h4 {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
          .fa-dashboard-latest-card a {
            align-self: flex-start !important;
          }
          .fa-mobile-two-col {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .fa-course-card-inner {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
            align-items: start !important;
          }
          .fa-course-card-icon {
            display: none !important;
          }
          .fa-course-meta-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .fa-course-actions {
            width: 100% !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          .fa-course-actions a {
            width: 100% !important;
          }
          .fa-subscription-header {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            align-items: start !important;
          }
          .fa-subscription-header h3 {
            line-height: 1.18 !important;
          }
          .fa-subscription-action {
            justify-self: start !important;
            min-width: 0 !important;
            width: 100% !important;
          }
          .fa-subscription-action > * {
            width: auto !important;
            max-width: 100% !important;
          }
          .fa-subscription-detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .fa-profile-grid {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
            width: 100% !important;
          }
          .fa-profile-grid > div {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }
          .fa-profile-grid > div:first-child {
            padding: 24px 18px !important;
          }
          .fa-profile-grid > div:first-child h3,
          .fa-profile-grid > div:first-child p {
            max-width: 100% !important;
          }
          .fa-profile-grid > div:first-child a {
            width: 100% !important;
            max-width: 220px !important;
          }
          .fa-profile-detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
          .fa-profile-detail-grid > div {
            min-width: 0 !important;
            padding: 14px 12px !important;
          }
          .fa-profile-detail-grid strong {
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
          }
          .fa-profile-detail-wide {
            grid-column: 1 / -1 !important;
          }
        }
      ` }} />
      <main className="px-4 py-8 md:py-12">
        <div className="container mx-auto max-w-6xl">
          <section className="space-y-8">

            {activeTab === 'dashboard' ? (
              <div className="space-y-8">
                <div className="fa-dashboard-welcome overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
                    <div className="flex items-start gap-5">
                      <div
                        aria-hidden="true"
                        style={{
                          width: '56px',
                          minWidth: '56px',
                          height: '56px',
                          minHeight: '56px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '16px',
                          backgroundColor: 'rgba(94, 63, 222, 0.10)',
                          color: '#5e3fde',
                          fontSize: '20px',
                          fontWeight: 800,
                          lineHeight: 1,
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {String(firstName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5e3fde]">Account overview</p>
                        <h2 className="mt-2 font-heading text-3xl font-bold text-slate-950 md:text-4xl">Hi {firstName}, Welcome back.</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Continue your course, review billing, and manage your account details from one clean dashboard.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link href="/my-account?tab=courses" className="inline-flex rounded-xl bg-[#5e3fde] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5e3fde]/20 transition hover:bg-[#4c32c4]">My Courses</Link>
                      <Link href="/my-account?tab=payments" className="inline-flex rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#5e3fde]/30 hover:text-[#5e3fde]">Payments</Link>
                    </div>
                  </div>
                  <div className="fa-welcome-strip" />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <StatCard label="Active Courses" value={activeAccessRecords.length} helper="Courses you can access now" />
                  <StatCard label="Auto-renew On" value={activeAutoRenewSubscriptions.length} helper="Plans renewing automatically" />
                  <StatCard label="Expired Access" value={expiredAccessRecords.length} helper="Courses that may need renewal" />
                </div>

                {(expiringOneTimeAccessItems.length > 0 || expiredOneTimeAccessItems.length > 0) ? (
                  <div className="space-y-4">
                    {expiringOneTimeAccessItems.slice(0, 3).map(({ record, state }: any) => (
                      <div key={`expiring-${record.id}`} className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Renewal reminder</p>
                        <h3 className="mt-2 font-heading text-xl font-bold text-gray-950">{record.course.title} access expires in {daysUntil(state.accessEnd)} day{daysUntil(state.accessEnd) === 1 ? '' : 's'}.</h3>
                        <p className="mt-1 text-sm text-amber-800">Your one-time course access is active until <strong>{formatDate(state.accessEnd)}</strong>. Renew before expiry to avoid losing access.</p>
                        <Link href={`/courses/${record.course.slug}`} className="mt-4 inline-flex rounded-xl bg-[#5e3fde] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c32c4]">Renew Access</Link>
                      </div>
                    ))}
                    {expiredOneTimeAccessItems.slice(0, 3).map(({ record, state }: any) => (
                      <div key={`expired-${record.id}`} className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">Access expired</p>
                        <h3 className="mt-2 font-heading text-xl font-bold text-gray-950">{record.course.title} access has expired.</h3>
                        <p className="mt-1 text-sm text-red-800">Your one-time course access ended on <strong>{formatDate(state.accessEnd)}</strong>. Renew to continue watching course content.</p>
                        <Link href={`/courses/${record.course.slug}`} className="mt-4 inline-flex rounded-xl bg-[#5e3fde] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c32c4]">Renew Access</Link>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="fa-mobile-section-heading mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-heading text-2xl font-bold text-gray-950">Latest Course</h3>
                        <p className="mt-1 text-sm text-gray-500">Your most recent course access.</p>
                      </div>
                      <Link href="/my-account?tab=courses" className="text-sm font-bold text-[#5e3fde] hover:underline">View all</Link>
                    </div>
                    {latestAccess ? (
                      <div className="fa-dashboard-latest-card flex flex-col gap-4 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <CourseIcon image={latestAccess.course.featuredImage} title={latestAccess.course.title} />
                          <div className="min-w-0">
                            <h4 className="truncate font-heading text-xl font-bold text-gray-950">{latestAccess.course.title}</h4>
                            <p className="mt-1 text-sm text-gray-600">Access {latestAccessItem?.state.autoRenewOn ? 'active' : 'until'} <strong className="text-gray-950">{latestAccessItem?.state.autoRenewOn ? `(renews ${formatDate(latestAccessItem.state.accessEnd)})` : formatDate(latestAccessItem?.state.accessEnd)}</strong></p>
                          </div>
                        </div>
                        <Link href={getCoursePageHref(latestAccess.course)} className="inline-flex shrink-0 rounded-xl bg-[#5e3fde] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c32c4]">View Course</Link>
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">No active course access found.</p>
                    )}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="fa-mobile-section-heading mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-heading text-2xl font-bold text-gray-950">Subscription Status</h3>
                        <p className="mt-1 text-sm text-gray-500">Renewal and access information.</p>
                      </div>
                      <Link href="/my-account?tab=subscriptions" className="text-sm font-bold text-[#5e3fde] hover:underline">Manage</Link>
                    </div>
                    {nextRenewal ? (
                      <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-700">Auto-renew enabled</p>
                        <h4 className="mt-2 font-heading text-xl font-bold text-gray-950">{nextRenewal.course.title}</h4>
                        <p className="mt-1 text-sm text-green-800">Next renewal: <strong>{formatDate(nextRenewal.currentPeriodEnd)}</strong></p>
                      </div>
                    ) : endingSubscription ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Auto-renew cancelled</p>
                        <h4 className="mt-2 font-heading text-xl font-bold text-gray-950">{endingSubscription.course.title}</h4>
                        <p className="mt-1 text-sm text-amber-800">Access active until <strong>{formatDate(endingSubscription.currentPeriodEnd)}</strong></p>
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">No active auto-renew subscription found.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="fa-mobile-section-heading mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-heading text-2xl font-bold text-gray-950">Recent Payment</h3>
                      <p className="mt-1 text-sm text-gray-500">Latest order connected with your account.</p>
                    </div>
                    <Link href="/my-account?tab=payments" className="text-sm font-bold text-[#5e3fde] hover:underline">View all payments</Link>
                  </div>
                  {latestOrder ? (
                    <div className="fa-mobile-two-col grid gap-3 md:grid-cols-4">
                      <DetailItem label="Order" value={latestOrder.orderNumber} />
                      <DetailItem label="Amount" value={formatCurrency(latestOrder.totalAmount, latestOrder.currency)} />
                      <DetailItem label="Status" value={<span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadgeClass(latestOrder.status)}`}>{latestOrder.status}</span>} />
                      <DetailItem label="Date" value={formatDate(latestOrder.createdAt)} />
                    </div>
                  ) : (
                    <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">No payments found yet.</p>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === 'courses' ? (
              <div>
                <PageSection eyebrow="Customer Portal" title="My Courses" description="View your available courses, access status, and renewal actions in one place." />
                {accessRecords.length === 0 ? (
                  <EmptyState title="No course access yet" description="Choose a plan to access the on-demand class videos." actionHref="/courses/on-demand-fitness-class-videos" actionLabel="View On-Demand Classes" />
                ) : (
                  <div className="space-y-5">
                    {accessRecords.map((record: any) => {
                      const subscription = subscriptionsByCourseId.get(record.courseId);
                      const state = getAccessState(record, subscription);
                      const expired = state.expired;
                      const isAutoRenew = state.autoRenewOn;
                      const isAutoRenewCancelled = state.autoRenewCancelled;
                      const amount = getOrderItemAmount(record.order, record.courseId) ?? getAccessPlanAmount(record, subscription);
                      const accessDate = state.accessEnd;
                      const renewHref = `/checkout?type=course&id=${record.courseId}${record.courseAccessPlanId ? `&planId=${record.courseAccessPlanId}` : subscription?.courseAccessPlanId ? `&planId=${subscription.courseAccessPlanId}` : ''}&renew=1`;
                      return (
                        <div key={record.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md" style={{ padding: '24px' }}>
                          <div className="fa-course-card-inner" style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 148px', gap: '24px', alignItems: 'center' }}>
                            <div className="fa-course-card-icon"><CourseIcon image={record.course.featuredImage} title={record.course.title} /></div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {isAutoRenew ? <span className="rounded-full bg-[#5e3fde]/10 px-3 py-1 text-xs font-bold text-[#5e3fde]">Auto-renew enabled</span> : null}
                                {isAutoRenewCancelled ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Auto-renew cancelled</span> : null}
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${expired ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-green-50 text-green-700 ring-green-200'}`}>
                                  {expired ? 'Access expired' : isAutoRenew ? `Access active · Renews ${formatDate(accessDate)}` : `Access active until ${formatDate(accessDate)}`}
                                </span>
                              </div>
                              <h3 className="mt-3 font-heading text-2xl font-bold leading-snug text-gray-950">{record.course.title}</h3>
                              <div className="fa-course-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginTop: '20px' }}>
                                <DetailItem label="Plan" value={record.courseAccessPlan?.name || subscription?.courseAccessPlan?.name || 'Course Access'} />
                                <DetailItem label="Amount" value={amount !== null ? formatCurrency(amount, record.order?.currency || 'USD') : '—'} />
                                <DetailItem label="Started" value={formatDate(record.startsAt || record.createdAt)} />
                                <DetailItem label={isAutoRenew ? "Next renewal" : "Access until"} value={formatDate(accessDate)} />
                              </div>
                            </div>
                            <div className="fa-course-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '148px' }}>
                              <Link href={expired ? renewHref : getCoursePageHref(record.course)} className="inline-flex h-12 items-center justify-center rounded-xl bg-[#5e3fde] px-5 text-sm font-semibold text-white shadow-lg shadow-[#5e3fde]/15 transition hover:bg-[#4c32c4]">
                                {expired ? 'Renew Access' : 'View Course'}
                              </Link>
                              {subscription ? (
                                <Link href="/my-account?tab=subscriptions" className="inline-flex h-12 items-center justify-center rounded-xl border border-[#5e3fde]/20 bg-white px-5 text-sm font-semibold text-[#5e3fde] transition hover:bg-[#5e3fde]/5">Manage</Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === 'subscriptions' ? (
              <div>
                <PageSection eyebrow="Billing" title="My Subscriptions" description="Review active auto-renew plans, upcoming billing dates, and renewal controls." />
                {subscriptions.length === 0 ? (
                  <EmptyState title="No auto-renew subscriptions yet" description="Your auto-renew subscriptions will appear here after checkout." actionHref="/courses/on-demand-fitness-class-videos" actionLabel="View On-Demand Classes" />
                ) : (
                  <div className="space-y-5">
                    {subscriptions.map((subscription: any) => {
                      const planAmount = getAccessPlanAmount(null, subscription);
                      const subscriptionOrder = findSubscriptionOrder(subscription);
                      const orderAmount = getOrderItemAmount(subscriptionOrder, subscription.courseId);
                      const amount = orderAmount ?? planAmount;
                      const subscriptionActive = subscriptionIsActive(subscription);
                      const activeAutoRenew = subscriptionActive && !subscription.cancelAtPeriodEnd;
                      const accessEnded = activeAutoRenew ? false : isExpiredAccess(subscription.currentPeriodEnd);
                      const renewHref = `/checkout?type=course&id=${subscription.courseId}${subscription.courseAccessPlanId ? `&planId=${subscription.courseAccessPlanId}` : ''}&renew=1`;
                      return (
                        <div key={subscription.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                          <div className="fa-subscription-header border-b border-gray-100 bg-gray-50 p-6" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '24px', alignItems: 'center' }}>
                            <div className="min-w-0">
                              <div className="mb-3 flex flex-wrap gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${subscription.cancelAtPeriodEnd ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-green-50 text-green-700 ring-green-200'}`}>
                                  {subscription.cancelAtPeriodEnd ? 'Auto-renew cancelled' : 'Auto-renew enabled'}
                                </span>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${accessEnded ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-green-50 text-green-700 ring-green-200'}`}>
                                  {activeAutoRenew ? `Access active · Next renewal ${formatDate(subscription.currentPeriodEnd)}` : accessEnded ? 'Access ended' : `Access active until ${formatDate(subscription.currentPeriodEnd)}`}
                                </span>
                              </div>
                              <h3 className="font-heading text-2xl font-bold text-gray-950">{subscription.course.title}</h3>
                              <p className="mt-1 text-sm text-gray-500">{activeAutoRenew ? 'This plan will renew automatically on the next billing date.' : subscription.cancelAtPeriodEnd ? (accessEnded ? 'Auto-renewal has ended. Renew access to start a new billing period.' : 'Auto-renewal will not charge again after this period.') : 'Subscription access is not currently renewing automatically.'}</p>
                            </div>
                            <div className="fa-subscription-action" style={{ justifySelf: 'end', minWidth: '190px' }}>
                              <SubscriptionActions subscriptionId={subscription.id} status={subscription.status} cancelAtPeriodEnd={subscription.cancelAtPeriodEnd} variant="account" accessExpired={accessEnded} renewHref={renewHref} />
                            </div>
                          </div>
                          <div className="fa-subscription-detail-grid grid gap-3 p-6 md:grid-cols-3">
                            <DetailItem label="Plan" value={subscription.courseAccessPlan?.name || 'Course Access'} />
                            <DetailItem label="Billing amount" value={amount !== null ? formatCurrency(amount, subscriptionOrder?.currency || 'USD') : '—'} />
                            <DetailItem label="Billing cycle" value={getBillingCycle(subscription.courseAccessPlan, subscription)} />
                            <DetailItem label="Started" value={formatDate(subscription.currentPeriodStart || subscription.createdAt)} />
                            <DetailItem label={activeAutoRenew ? 'Next renewal' : subscription.cancelAtPeriodEnd ? (accessEnded ? 'Access ended' : 'Access ends') : (accessEnded ? 'Access ended' : 'Access until')} value={formatDate(subscription.currentPeriodEnd)} />
                            <DetailItem label="Last payment" value={subscriptionOrder ? formatDate(subscriptionOrder.createdAt) : '—'} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === 'payments' ? (
              <div>
                <PageSection eyebrow="Billing" title="Payment History" description="Track recent orders, completed payments, and subscription renewal charges." />
                {orders.length === 0 ? (
                  <EmptyState title="No payment history yet" description="Completed and pending course payments will appear here." />
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                        <thead className="bg-gray-50 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                          <tr>
                            <th className="px-6 py-4">Order</th>
                            <th className="px-6 py-4">Course / Plan</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {orders.map((order: any) => {
                            const title = order.items?.map((item: any) => item.name).filter(Boolean).join(', ') || 'Order';
                            const planNames = order.items?.map((item: any) => item.courseAccessPlan?.name).filter(Boolean).join(', ');
                            return (
                              <tr key={order.id} className="align-top">
                                <td className="whitespace-nowrap px-6 py-5">
                                  <strong className="block text-gray-950">{order.orderNumber}</strong>
                                  <span className="mt-1 block text-xs text-gray-400">{order.paymentMethod || 'Payment'}</span>
                                </td>
                                <td className="min-w-[280px] px-6 py-5">
                                  <strong className="block text-gray-950">{title}</strong>
                                  {planNames ? <span className="mt-1 block text-xs text-gray-500">{planNames}</span> : null}
                                </td>
                                <td className="whitespace-nowrap px-6 py-5"><strong className="text-gray-950">{formatCurrency(order.totalAmount, order.currency)}</strong></td>
                                <td className="whitespace-nowrap px-6 py-5"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadgeClass(order.status)}`}>{order.status}</span></td>
                                <td className="whitespace-nowrap px-6 py-5 text-gray-600">{formatDate(order.createdAt)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === 'profile' ? (
              <div>
                <PageSection eyebrow="Account" title="Profile" description="Manage the details connected with your course access and billing account." />
                <div className="fa-profile-grid" style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5e3fde]/10 text-2xl font-bold text-[#5e3fde]">{String(displayName || user.email || 'U').charAt(0).toUpperCase()}</div>
                    <h3 className="mt-4 truncate font-heading text-2xl font-bold text-gray-950">{displayName}</h3>
                    <p className="mt-1 truncate text-sm text-gray-500">{user.email}</p>
                    <Link href="/my-account?tab=password" className="mt-5 inline-flex justify-center rounded-xl bg-[#5e3fde] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5e3fde]/15 transition hover:bg-[#4c32c4]">Change Password</Link>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="fa-profile-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
                      <DetailItem label="First name" value={user.firstName || '—'} />
                      <DetailItem label="Last name" value={user.lastName || '—'} />
                      <DetailItem label="Email" value={user.email} className="fa-profile-detail-wide" />
                      <DetailItem label="Phone" value={user.phone || '—'} />
                      <DetailItem label="Username" value={user.username || user.email} className="fa-profile-detail-wide" />
                      <DetailItem label="Member since" value={formatDateTime(user.createdAt)} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'password' ? (
              <div>
                <PageSection eyebrow="Security" title="Change Password" description="Update your password to keep your customer account secure." />
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  <ChangePasswordForm />
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
