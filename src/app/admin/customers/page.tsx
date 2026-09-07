import { Download, ExternalLink, Mail, ShoppingBag, Users, WalletCards } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SearchFilterClient from '@/components/SearchFilterClient';

export const dynamic='force-dynamic';

export default async function CustomersPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const {q=''}=await searchParams;
  const allOrders=await prisma.order.findMany({include:{customer:true},orderBy:{createdAt:'desc'}});
  const map=new Map<string,any>();
  for(const order of allOrders){
    const email=order.customerEmail;let name='Guest';
    if(order.customer) name=`${order.customer.firstName||''} ${order.customer.lastName||''}`.trim()||order.customer.username;
    else try{const a=JSON.parse(order.billingAddress);name=`${a.firstName||''} ${a.lastName||''}`.trim()||'Guest';}catch{}
    if(!map.has(email))map.set(email,{email,name,userId:order.customerId,orderCount:0,totalSpent:0,lastOrderDate:order.createdAt});
    const c=map.get(email);c.orderCount++;if(order.status==='COMPLETED')c.totalSpent+=order.totalAmount;if(new Date(order.createdAt)>new Date(c.lastOrderDate))c.lastOrderDate=order.createdAt;
  }
  let customers=Array.from(map.values()).sort((a,b)=>new Date(b.lastOrderDate).getTime()-new Date(a.lastOrderDate).getTime());
  if(q){const t=q.toLowerCase();customers=customers.filter(c=>c.name.toLowerCase().includes(t)||c.email.toLowerCase().includes(t));}
  const totalSpent=customers.reduce((s,c)=>s+c.totalSpent,0);const registered=customers.filter(c=>c.userId).length;

  return <div className="max-w-[1240px] space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Customers</h1><p className="text-sm text-gray-500 mt-1.5">See customer purchasing history and account status in one place.</p></div><a href="/api/customers/export" download className="inline-flex items-center gap-2 bg-[#5e3fde] !text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4b32b2]"><Download size={16}/> Export Customers</a></div>
    <div className="grid sm:grid-cols-3 gap-4"><div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-gray-500"><Users size={15}/> Customers</div><div className="text-2xl font-bold text-gray-900 mt-2">{customers.length}</div></div><div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-gray-500"><ShoppingBag size={15}/> Registered accounts</div><div className="text-2xl font-bold text-gray-900 mt-2">{registered}</div></div><div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-xs text-gray-500"><WalletCards size={15}/> Completed spend</div><div className="text-2xl font-bold text-gray-900 mt-2">${totalSpent.toFixed(2)}</div></div></div>
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"><div className="p-4 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><SearchFilterClient placeholder="Search customers..."/><span className="text-xs text-gray-500">Showing {customers.length} customer{customers.length===1?'':'s'}</span></div>
      {customers.length===0?<div className="py-16 text-center"><Users size={38} className="text-gray-300 mx-auto"/><h2 className="text-base font-semibold text-gray-900 mt-4">No customers found</h2></div>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="bg-gray-50/40 border-b border-gray-100"><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Order</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Orders</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Spent</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100">{customers.map((c,i)=><tr key={`${c.email}-${i}`} className="hover:bg-gray-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center font-bold text-sm">{c.name.charAt(0).toUpperCase()}</div><div><div className="font-semibold text-gray-900 flex items-center gap-2">{c.name}{!c.userId&&<span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Guest</span>}</div><a href={`mailto:${c.email}`} className="text-xs text-[#5e3fde] hover:underline inline-flex items-center gap-1 mt-1"><Mail size={11}/>{c.email}</a></div></div></td><td className="px-5 py-4 text-gray-600">{new Date(c.lastOrderDate).toLocaleDateString()}</td><td className="px-5 py-4 font-medium text-gray-900">{c.orderCount}</td><td className="px-5 py-4 font-semibold text-emerald-700">${c.totalSpent.toFixed(2)}</td><td className="px-5 py-4 text-right">{c.userId?<Link href={`/admin/users/${c.userId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5e3fde] hover:underline"><ExternalLink size={14}/> Profile</Link>:<span className="text-xs text-gray-400">Guest</span>}</td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}
