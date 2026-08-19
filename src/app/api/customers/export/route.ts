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

    const allOrders = await prisma.order.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });

    const customersMap = new Map();

    allOrders.forEach(order => {
      const email = order.customerEmail;
      
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
      
      if (new Date(order.createdAt) > new Date(customer.lastOrderDate)) {
        customer.lastOrderDate = order.createdAt;
      }
    });

    const customers = Array.from(customersMap.values());
    customers.sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());

    let csvContent = 'Name,Email,Order Count,Total Spent,Last Order Date\n';

    customers.forEach(customer => {
      const name = `"${customer.name.replace(/"/g, '""')}"`;
      csvContent += `${name},${customer.email},${customer.orderCount},${customer.totalSpent},${new Date(customer.lastOrderDate).toISOString()}\n`;
    });

    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set('Content-Disposition', 'attachment; filename="customers.csv"');

    return response;
  } catch (error) {
    console.error('Export customers error:', error);
    return new NextResponse('Server Error', { status: 500 });
  }
}
