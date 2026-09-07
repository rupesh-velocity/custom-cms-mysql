import { Eye, Search, ShoppingCart, CheckCircle2, Clock3, DollarSign, Download } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SearchFilterClient from '@/components/SearchFilterClient';

export const dynamic='force-dynamic';

const statusClass:Record<string,string>={COMPLETED:'bg-emerald-50 text-emerald-700 border-emerald-100',PROCESSING:'bg-blue-50 text-blue-700 border-blue-100',PENDING:'bg-amber-50 text-amber-700 border-amber-100',CANCELLED:'bg-red-50 text-red-700 border-red-100'};

export default async function OrdersPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const {q=''}=await searchParams;
  const where:any=q?{OR:[{orderNumber:{contains:q,mode:'insensitive'}},{customerEmail:{contains:q,mode:'insensitive'}},{billingAddress:{contains:q,mode:'insensitive'}}]}:{};
  const orders=await prisma.order.findMany({where,orderBy:{createdAt:'desc'},include:{customer:true,items:true}});
  const completed=orders.filter(o=>o.status==='COMPLETED');
  const pending=orders.filter(o=>o.status==='PENDING'||o.status==='PROCESSING');
  const revenue=completed.reduce((s,o)=>s+o.totalAmount,0);

  return <div className="max-w-[1240px] space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Orders</h1><p className="text-sm text-gray-500 mt-1.5">Review purchases, payment status and customer order activity.</p></div><a href="/api/orders/export" download className="inline-flex items-center gap-2 bg-[#5e3fde] !text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4b32b2]"><Download size={16}/> Export Orders</a></div>

    <div className="grid sm:grid-cols-3 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-gray-500"><ShoppingCart size={15}/> Total orders</div><div className="text-2xl font-bold text-gray-900 mt-2">{orders.length}</div></div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-gray-500"><Clock3 size={15}/> Pending / processing</div><div className="text-2xl font-bold text-gray-900 mt-2">{pending.length}</div></div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-gray-500"><DollarSign size={15}/> Completed revenue</div><div className="text-2xl font-bold text-gray-900 mt-2">${revenue.toFixed(2)}</div></div>
    </div>

    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><SearchFilterClient placeholder="Search orders..."/><span className="text-xs text-gray-500">Showing {orders.length} order{orders.length===1?'':'s'}</span></div>
      {orders.length===0?<div className="py-16 text-center"><ShoppingCart size={38} className="text-gray-300 mx-auto"/><h2 className="text-base font-semibold text-gray-900 mt-4">No orders found</h2><p className="text-sm text-gray-500 mt-1">Orders will appear here after checkout.</p></div>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="bg-gray-50/40 border-b border-gray-100"><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{orders.map(order=>{
        let billing='';try{const x=JSON.parse(order.billingAddress);billing=`${x.firstName||''} ${x.lastName||''}`.trim();}catch{};billing=billing||order.customerEmail||'Guest';
        return <tr key={order.id} className="hover:bg-gray-50/60 transition-colors"><td className="px-5 py-4"><Link href={`/admin/orders/${order.id}`} className="font-semibold text-[#5e3fde] hover:underline">{order.orderNumber}</Link><div className="text-xs text-gray-400 mt-1">{order.items.length} item{order.items.length===1?'':'s'}</div></td><td className="px-5 py-4 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}<div className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></td><td className="px-5 py-4"><span className={`inline-flex border px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass[order.status]||'bg-gray-50 text-gray-600 border-gray-100'}`}>{order.status}</span></td><td className="px-5 py-4"><div className="font-medium text-gray-900">{billing}</div><div className="text-xs text-gray-500 mt-1">{order.customerEmail}</div></td><td className="px-5 py-4 font-semibold text-gray-900">${order.totalAmount.toFixed(2)}</td><td className="px-5 py-4 text-right"><Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5e3fde] hover:underline"><Eye size={15}/> View</Link></td></tr>;
      })}</tbody></table></div>}
    </div>
  </div>;
}
