'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeroBanner from '@/components/PageHeroBanner';

interface AccessPlan {
  id: number;
  name: string;
  durationMonths: number;
  regularPrice: number;
  salePrice: number | null;
  isActive: boolean;
  isDefault: boolean;
}

interface CourseLandingClientProps {
  course: {
    id: number;
    title: string;
    contentHtml: string | null;
    featuredImage: string | null;
    pricingType?: string | null;
    price?: number | null;
    salePrice?: number | null;
    accessPlans?: AccessPlan[];
  }
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function planPrice(plan: AccessPlan) {
  return plan.salePrice || plan.regularPrice;
}

export default function CourseLandingClient({ course }: CourseLandingClientProps) {
  const plans = useMemo(() => (course.accessPlans || []).filter((plan) => plan.isActive), [course.accessPlans]);
  const isVariable = course.pricingType === 'VARIABLE' && plans.length > 0;
  const defaultPlan = plans.find((plan) => plan.isDefault) || plans[0];
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(defaultPlan?.id || null);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || defaultPlan;
  const price = isVariable && selectedPlan ? planPrice(selectedPlan) : (course.salePrice || course.price || 0);
  const regularPrice = isVariable && selectedPlan ? selectedPlan.regularPrice : (course.price || 0);
  const salePrice = isVariable && selectedPlan ? selectedPlan.salePrice : course.salePrice;
  const checkoutHref = `/checkout?type=course&id=${course.id}${isVariable && selectedPlan ? `&planId=${selectedPlan.id}` : ''}`;

  const simplePriceBlock = !isVariable && price > 0 ? (
    <div className="text-center">
      <div className="flex items-baseline gap-3 justify-center">
        <span className="text-4xl font-bold text-white">{money(price)}</span>
        {salePrice && salePrice < regularPrice ? <span className="text-xl text-white/60 line-through">{money(regularPrice)}</span> : null}
      </div>
    </div>
  ) : null;

  const enrollmentCard = isVariable && selectedPlan ? (
    <aside id="course-access-plans" className="order-1 scroll-mt-32 lg:order-2 lg:sticky lg:top-28">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xl shadow-gray-200/60">
        <div className="mb-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e91e8f]">Course Access</span>
          <h2>Choose your plan</h2>
          <p className="mt-1 text-xs text-gray-500">Access starts immediately after checkout.</p>
        </div>

        <div className="space-y-3">
          {plans.map((plan) => {
            const currentPrice = planPrice(plan);
            const isSelected = selectedPlan.id === plan.id;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`group w-full rounded-xl border px-4 py-3 text-left transition-all ${
                  isSelected
                    ? 'border-[#5e3fde] bg-[#5e3fde]/5 ring-1 ring-[#5e3fde]/20'
                    : 'border-gray-200 bg-white hover:border-[#5e3fde]/40'
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-start gap-3">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isSelected ? 'border-[#5e3fde] bg-[#5e3fde]' : 'border-gray-300 bg-white group-hover:border-[#5e3fde]'
                    }`}>
                      {isSelected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold text-gray-950">{plan.name}</span>
                      <span className="block text-xs text-gray-500">{plan.durationMonths} month access</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-base font-black text-gray-950">{money(currentPrice)}</span>
                    {plan.salePrice && plan.salePrice < plan.regularPrice ? <span className="block text-xs font-semibold text-gray-400 line-through">{money(plan.regularPrice)}</span> : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <span className="font-semibold text-gray-950">Selected: {selectedPlan.name}</span>
          <span className="text-gray-500"> • {money(planPrice(selectedPlan))}</span>
        </div>

        <Link href={checkoutHref} className="mt-4 block w-full rounded-xl bg-[#5e3fde] px-6 py-4 text-center text-base font-bold text-white shadow-lg shadow-[#5e3fde]/25 transition-all hover:bg-[#4b32b2] hover:shadow-[#5e3fde]/35">
          Enroll Now
        </Link>
      </div>
    </aside>
  ) : null;

  return (
    <div className="min-h-screen bg-gray-50 w-full pb-16">
      <PageHeroBanner
        title={course.title}
        image={course.featuredImage}
        description={simplePriceBlock}
      />

      <div id="curriculum" className={`scroll-mt-32 mx-auto grid max-w-6xl gap-6 px-5 pt-10 md:px-6 lg:pt-12 ${isVariable ? 'lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start' : 'lg:max-w-4xl'}`}>
        <div className={`section-about-course rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/60 md:p-12 ${
    isVariable ? 'order-2 lg:order-1' : ''
  }`} style={{ marginTop: 0 }}>
          <h2>About This Course</h2>
          {course.contentHtml ? (
            <div className="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: course.contentHtml }} />
          ) : (
            <p className="text-gray-500 italic text-lg">Detailed course description coming soon...</p>
          )}
        </div>

        {enrollmentCard}
      </div>
    </div>
  );
}
