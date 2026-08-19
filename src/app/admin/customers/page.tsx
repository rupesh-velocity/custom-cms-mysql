import { Users, Search, Filter, ExternalLink } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SearchFilterClient from '@/components/SearchFilterClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';

  // Fetch all orders to compute unique customers
  const allOrders = await prisma.order.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' }
  });

  const customersMap = new Map();

  allOrders.forEach(order => {
    const email = order.customerEmail;
    
    // Parse billing to try to get a better name for guests
    let name = 'Guest';
    if (order.customer) {
      name = `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.username;
    } else {
      try {
        const parsed = JSON.parse(order.billingAddress);
        if (parsed.firstName || parsed.lastName) {
          name = `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim();
        }
      } catch (e) {}
    }

    if (!customersMap.has(email)) {
      customersMap.set(email, {
        email,
        name,
        userId: order.customerId,
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: order.createdAt
      });
    }

    const customer = customersMap.get(email);
    customer.orderCount += 1;
    if (order.status === 'COMPLETED') {
      customer.totalSpent += order.totalAmount;
    }
    
    // Update last order date if this order is more recent
    if (new Date(order.createdAt) > new Date(customer.lastOrderDate)) {
      customer.lastOrderDate = order.createdAt;
    }
  });

  let customers = Array.from(customersMap.values());
  // Sort by most recent order
  customers.sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());

  if (q) {
    const lowerQ = q.toLowerCase();
    customers = customers.filter(c => 
      c.name.toLowerCase().includes(lowerQ) || 
      c.email.toLowerCase().includes(lowerQ)
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 text-[#2c3338]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-normal">Customers</h1>
        <a href="/api/customers/export" download className="px-4 py-2 bg-[#5e3fde] text-white rounded text-[13px] font-medium hover:bg-[#4b32b2] transition-colors">
          Export Customers
        </a>
      </div>

      <div className="bg-white border border-[#c3c4c7] shadow-sm mb-6 flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <SearchFilterClient placeholder="Search customers..." />
          <button className="flex items-center gap-2 px-3 py-1.5 border border-[#8c8f94] rounded-[3px] text-[13px] hover:bg-gray-50">
            <Filter size={14} /> Filter
          </button>
        </div>
        <div className="text-[13px] text-gray-500">
          Showing {customers.length} customers
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white border border-[#c3c4c7] p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gray-50 rounded-full">
              <Users size={40} className="text-gray-400" />
            </div>
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">No customers yet</h2>
          <p className="text-gray-500 mb-6">When people place orders, they will appear here as customers.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#c3c4c7]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f6f7f7] border-b border-[#c3c4c7]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Last Order</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Orders</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Total Spent</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c3c4c7]">
                {customers.map((customer, idx) => (
                  <tr key={idx} className="hover:bg-[#f6f7f7] transition-colors group">
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#5e3fde]/10 flex items-center justify-center text-[#5e3fde] font-bold text-[10px]">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      {customer.name}
                      {!customer.userId && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">Guest</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#5e3fde]">
                      <a href={`mailto:${customer.email}`}>{customer.email}</a>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(customer.lastOrderDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.orderCount}
                    </td>
                    <td className="px-4 py-3 font-medium text-green-700">
                      ${customer.totalSpent.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {customer.userId ? (
                        <Link href={`/admin/users/${customer.userId}`} className="inline-flex items-center gap-1 text-gray-400 hover:text-[#5e3fde] transition-colors">
                          <ExternalLink size={14} /> <span className="text-xs font-medium">Profile</span>
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
