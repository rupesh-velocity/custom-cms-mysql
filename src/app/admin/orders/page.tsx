import { ShoppingCart, Clock3, DollarSign, Download } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SearchFilterClient from '@/components/SearchFilterClient';
import OrderListActions from './OrderListActions';
import OrderBulkForm from './OrderBulkForm';

export const dynamic='force-dynamic';

const statusClass:Record<string,string>={COMPLETED:'bg-emerald-50 text-emerald-700 border-emerald-100',PROCESSING:'bg-blue-50 text-blue-700 border-blue-100',PENDING:'bg-amber-50 text-amber-700 border-amber-100',CANCELLED:'bg-red-50 text-red-700 border-red-100',TRASH:'bg-gray-100 text-gray-600 border-gray-200'};

export default async function OrdersPage({searchParams}:{searchParams:Promise<{q?:string;status?:string}>}){
  const {q='',status=''}=await searchParams;
  const currentStatus=status||'all';
  const showTrash=currentStatus==='trash';

  const searchWhere=q?{OR:[{orderNumber:{contains:q,mode:'insensitive'}},{customerEmail:{contains:q,mode:'insensitive'}},{billingAddress:{contains:q,mode:'insensitive'}}]}:{};

  const statusWhere = currentStatus === 'trash'
    ? {status:'TRASH'}
    : currentStatus === 'pending'
      ? {status:{in:['PENDING','PROCESSING']}}
      : currentStatus === 'completed'
        ? {status:'COMPLETED'}
        : {NOT:{status:'TRASH'}};

  const where:any={AND:[searchWhere,statusWhere].filter(Boolean)};

  const [orders,allCount,pendingCount,completedCount,trashCount]=await Promise.all([
    prisma.order.findMany({where,orderBy:{createdAt:'desc'},include:{customer:true,items:true}}),
    prisma.order.count({where:{NOT:{status:'TRASH'}}}),
    prisma.order.count({where:{status:{in:['PENDING','PROCESSING']}}}),
    prisma.order.count({where:{status:'COMPLETED'}}),
    prisma.order.count({where:{status:'TRASH'}}),
  ]);

  const completed=orders.filter(o=>o.status==='COMPLETED');
  const pending=orders.filter(o=>o.status==='PENDING'||o.status==='PROCESSING');
  const revenue=completed.reduce((s,o)=>s+o.totalAmount,0);

  const tabClass=(active:boolean)=>active?'font-semibold text-gray-950':'text-[#5e3fde] hover:text-[#4b32b2]';

  return <div className="max-w-[1240px] space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Orders</h1><p className="text-sm text-gray-500 mt-1.5">Review purchases, payment status and customer order activity.</p></div><a href="/api/orders/export" download className="inline-flex items-center gap-2 bg-[#5e3fde] !text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4b32b2]"><Download size={16}/> Export Orders</a></div>

    <div className="grid sm:grid-cols-3 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-gray-500"><ShoppingCart size={15}/> {showTrash?'Trashed orders':'Total orders'}</div><div className="text-2xl font-bold text-gray-900 mt-2">{showTrash?trashCount:allCount}</div></div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-gray-500"><Clock3 size={15}/> Pending / processing</div><div className="text-2xl font-bold text-gray-900 mt-2">{pendingCount}</div></div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-gray-500"><DollarSign size={15}/> Completed revenue</div><div className="text-2xl font-bold text-gray-900 mt-2">${revenue.toFixed(2)}</div></div>
    </div>

    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Link href="/admin/orders" className={tabClass(currentStatus==='all')}>All ({allCount})</Link><span className="text-gray-300">|</span>
      <Link href="/admin/orders?status=pending" className={tabClass(currentStatus==='pending')}>Pending ({pendingCount})</Link><span className="text-gray-300">|</span>
      <Link href="/admin/orders?status=completed" className={tabClass(currentStatus==='completed')}>Completed ({completedCount})</Link><span className="text-gray-300">|</span>
      <Link href="/admin/orders?status=trash" className={tabClass(currentStatus==='trash')}>Trash ({trashCount})</Link>
    </div>

    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <SearchFilterClient placeholder={showTrash?'Search trash orders...':'Search orders...'}/>
        <span className="text-xs text-gray-500">Showing {orders.length} order{orders.length===1?'':'s'}</span>
      </div>
      {orders.length===0?<div className="py-16 text-center"><ShoppingCart size={38} className="text-gray-300 mx-auto"/><h2 className="text-base font-semibold text-gray-900 mt-4">No orders found</h2><p className="text-sm text-gray-500 mt-1">{showTrash?'Deleted/trash orders will appear here.':'Orders will appear here after checkout.'}</p></div>:<OrderBulkForm isTrash={showTrash}><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="bg-gray-50/40 border-b border-gray-100"><th className="px-5 py-3 w-12"><span className="sr-only">Select</span></th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{orders.map(order=>{
        let billing='';try{const x=JSON.parse(order.billingAddress);billing=`${x.firstName||''} ${x.lastName||''}`.trim();}catch{};billing=billing||order.customerEmail||'Guest';
        return <tr key={order.id} className="hover:bg-gray-50/60 transition-colors"><td className="px-5 py-4 align-top"><input type="checkbox" name="orderIds" value={order.id} className="h-4 w-4 rounded border-gray-300 text-[#5e3fde] focus:ring-[#5e3fde]" aria-label={`Select order ${order.orderNumber}`}/></td><td className="px-5 py-4"><Link href={`/admin/orders/${order.id}`} className="font-semibold text-[#5e3fde] hover:underline">{order.orderNumber}</Link><div className="text-xs text-gray-400 mt-1">{order.items.length} item{order.items.length===1?'':'s'}</div></td><td className="px-5 py-4 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}<div className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></td><td className="px-5 py-4"><span className={`inline-flex border px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass[order.status]||'bg-gray-50 text-gray-600 border-gray-100'}`}>{order.status}</span></td><td className="px-5 py-4"><div className="font-medium text-gray-900">{billing}</div><div className="text-xs text-gray-500 mt-1">{order.customerEmail}</div></td><td className="px-5 py-4 font-semibold text-gray-900">${order.totalAmount.toFixed(2)}</td><td className="px-5 py-4 text-right"><OrderListActions orderId={order.id} isTrash={showTrash} /></td></tr>;
      })}</tbody></table></div></OrderBulkForm>}
    </div>
  </div>;
}
