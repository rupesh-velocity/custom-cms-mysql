import { ShoppingCart, Eye, Search, Filter } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SearchFilterClient from '@/components/SearchFilterClient';

export const dynamic = 'force-dynamic';

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  
  const where: any = q ? {
    OR: [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { customerEmail: { contains: q, mode: 'insensitive' } },
      { billingAddress: { contains: q, mode: 'insensitive' } }
    ]
  } : {};

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      items: true
    }
  });

  return (
    <div className="max-w-7xl mx-auto p-8 text-[#2c3338]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-normal">Orders</h1>
        <a href="/api/orders/export" download className="px-4 py-2 bg-[#5e3fde] text-white rounded text-[13px] font-medium hover:bg-[#4b32b2] transition-colors">
          Export Orders
        </a>
      </div>

      <div className="bg-white border border-[#c3c4c7] shadow-sm mb-6 flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <SearchFilterClient placeholder="Search orders..." />
          <button className="flex items-center gap-2 px-3 py-1.5 border border-[#8c8f94] rounded-[3px] text-[13px] hover:bg-gray-50">
            <Filter size={14} /> Filter
          </button>
        </div>
        <div className="text-[13px] text-gray-500">
          Showing {orders.length} orders
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-[#c3c4c7] p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gray-50 rounded-full">
              <ShoppingCart size={40} className="text-gray-400" />
            </div>
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">When customers place orders on your store, they will appear here.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#c3c4c7]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f6f7f7] border-b border-[#c3c4c7]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Order</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Billing</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Total</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c3c4c7]">
                {orders.map(order => {
                  let billingInfo = 'N/A';
                  try {
                    const parsed = JSON.parse(order.billingAddress);
                    billingInfo = `${parsed.firstName} ${parsed.lastName}`.trim();
                  } catch(e) {}
                  
                  if (!billingInfo || billingInfo === 'undefined undefined' || billingInfo === 'N/A') {
                    billingInfo = order.customerEmail || 'Guest';
                  }

                  const statusColors: any = {
                    COMPLETED: 'bg-green-100 text-green-800',
                    PROCESSING: 'bg-blue-100 text-blue-800',
                    PENDING: 'bg-yellow-100 text-yellow-800',
                    CANCELLED: 'bg-red-100 text-red-800',
                  };
                  
                  return (
                    <tr key={order.id} className="hover:bg-[#f6f7f7] transition-colors group">
                      <td className="px-4 py-3 font-medium text-[#5e3fde]">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {billingInfo}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        ${order.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1 text-gray-400 hover:text-[#5e3fde] transition-colors">
                          <Eye size={16} /> <span className="text-xs font-medium">View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
