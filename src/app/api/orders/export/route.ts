import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('cms_session')?.value;
    
    if (!token) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production');
    const { payload } = await jwtVerify(token, secret);
    
    if (payload.role !== 'Administrator') {
  return new NextResponse('Forbidden', { status: 403 });
}

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' }
    });

    let csvContent = 'Order Number,Date,Status,Total Amount,Currency,Customer Email,Billing Name\n';

    orders.forEach(order => {
      let billingInfo = 'N/A';
      try {
        const parsed = JSON.parse(order.billingAddress);
        billingInfo = `${parsed.firstName} ${parsed.lastName}`.trim();
      } catch(e) {}
      
      if (!billingInfo || billingInfo === 'undefined undefined' || billingInfo === 'N/A') {
        billingInfo = order.customerEmail || 'Guest';
      }

      // Escape quotes in CSV
      billingInfo = `"${billingInfo.replace(/"/g, '""')}"`;

      csvContent += `${order.orderNumber},${new Date(order.createdAt).toISOString()},${order.status},${order.totalAmount},${order.currency},${order.customerEmail},${billingInfo}\n`;
    });

    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', 'attachment; filename="orders.csv"');

    return response;
  } catch (error) {
    console.error('Export orders error:', error);
    return new NextResponse('Server Error', { status: 500 });
  }
}
