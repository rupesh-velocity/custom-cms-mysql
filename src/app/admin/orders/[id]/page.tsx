import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import OrderDetailsClient from './OrderDetailsClient';

export const dynamic = 'force-dynamic';

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const orderId = parseInt(resolvedParams?.id);

  if (isNaN(orderId)) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
          variation: true
        }
      }
    }
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <OrderDetailsClient order={order} />
    </div>
  );
}
