'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Mail, Calendar, CreditCard, ShoppingBag, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { BASE_PATH } from '@/lib/config';

export default function OrderDetailsClient({ order }: { order: any }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [isUpdating, setIsUpdating] = useState(false);

  let billing = {} as any;
  let shipping = {} as any;
  
  try {
    billing = JSON.parse(order.billingAddress || '{}');
    shipping = JSON.parse(order.shippingAddress || '{}');
  } catch(e) {}

  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success('Order status updated');
        router.refresh();
      } else {
        toast.error('Failed to update status');
      }
    } catch(e) {
      toast.error('An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const statusColors: any = {
    COMPLETED: 'bg-green-100 text-green-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="text-[#2c3338]">
      <div className="mb-6">
        <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-[#5e3fde] hover:underline mb-4">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-normal flex items-center gap-3">
            Order {order.orderNumber}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-gray-100'}`}>
              {order.status}
            </span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items and Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order Items */}
          <div className="bg-white border border-[#c3c4c7] shadow-sm">
            <div className="border-b border-[#c3c4c7] px-4 py-3 flex items-center gap-2 font-medium">
              <ShoppingBag size={18} className="text-gray-400" /> Items
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 font-medium">Cost</th>
                    <th className="pb-2 font-medium">Qty</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-4">
                        <div className="font-medium text-[#5e3fde]">{item.name}</div>
                        {item.variation && (
                          <div className="text-xs text-gray-500 mt-1">
                            {Object.entries(JSON.parse(item.variation.attributes || '{}')).map(([k,v]) => `${k}: ${v}`).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-4">${item.price.toFixed(2)}</td>
                      <td className="py-4">x {item.quantity}</td>
                      <td className="py-4 text-right font-medium">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>${(order.totalAmount - order.shippingCost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span>${order.shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-white border border-[#c3c4c7] shadow-sm">
             <div className="border-b border-[#c3c4c7] px-4 py-3 flex items-center gap-2 font-medium">
               <Package size={18} className="text-gray-400" /> Customer & Addresses
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
               <div>
                 <h3 className="font-semibold mb-3 text-gray-900">Billing Address</h3>
                 {billing.firstName ? (
                   <address className="not-italic text-gray-600 leading-relaxed">
                     {billing.firstName} {billing.lastName}<br />
                     {billing.company && <>{billing.company}<br /></>}
                     {billing.address1}<br />
                     {billing.address2 && <>{billing.address2}<br /></>}
                     {billing.city}, {billing.state} {billing.zipCode}<br />
                     {billing.country}<br />
                     <a href={`mailto:${billing.email}`} className="text-[#5e3fde] hover:underline mt-2 inline-block">{billing.email}</a><br />
                     {billing.phone && <a href={`tel:${billing.phone}`} className="text-[#5e3fde] hover:underline">{billing.phone}</a>}
                   </address>
                 ) : (
                   <p className="text-gray-500 italic">No billing address provided.</p>
                 )}
               </div>
               <div>
                 <h3 className="font-semibold mb-3 text-gray-900">Shipping Address</h3>
                 {shipping.firstName ? (
                   <address className="not-italic text-gray-600 leading-relaxed">
                     {shipping.firstName} {shipping.lastName}<br />
                     {shipping.company && <>{shipping.company}<br /></>}
                     {shipping.address1}<br />
                     {shipping.address2 && <>{shipping.address2}<br /></>}
                     {shipping.city}, {shipping.state} {shipping.zipCode}<br />
                     {shipping.country}
                   </address>
                 ) : (
                   <p className="text-gray-500 italic">Same as billing or none provided.</p>
                 )}
               </div>
             </div>
          </div>
        </div>

        {/* Right Column: Actions and Metadata */}
        <div className="space-y-6">
          <div className="bg-white border border-[#c3c4c7] shadow-sm">
            <div className="border-b border-[#c3c4c7] px-4 py-3 font-medium">
              Order Details
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar size={16} className="text-gray-400" />
                <span>
                  <strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <CreditCard size={16} className="text-gray-400" />
                <span>
                  <strong>Payment:</strong> {order.paymentMethod || 'Manual / N/A'}
                </span>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-gray-700 font-medium mb-2">Order Status</label>
                <select 
                  className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-[#5e3fde]"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="PENDING">Pending payment</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button 
                  onClick={handleUpdateStatus}
                  disabled={isUpdating || status === order.status}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-[#5e3fde] hover:bg-[#4b32b2] text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Save size={16} /> Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
