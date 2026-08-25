import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { sendCoursePurchaseEmail } from '@/lib/email';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('cms_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production');
    const { payload } = await jwtVerify(token, secret);
    
    if (payload.role !== 'Administrator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);
    const { status } = await req.json();

    const previousOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!previousOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { 
        items: { include: { product: true } },
        customer: true 
      }
    });

    // If order was PENDING and is now COMPLETED, we must grant access and send emails!
    if (previousOrder.status !== 'COMPLETED' && status === 'COMPLETED' && order.customerId) {
      const userEmail = order.customerEmail;
      const userName = order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || userEmail : userEmail;

      for (const item of order.items) {
        let courseToGrant = null;

        if (item.product && item.product.linkedCourseId) {
          courseToGrant = await prisma.course.findUnique({ where: { id: item.product.linkedCourseId } });
        } else if (!item.product) {
          courseToGrant = await prisma.course.findFirst({ where: { title: item.name } });
        }

        if (courseToGrant) {
          const existingAccess = await prisma.userCourseAccess.findFirst({
            where: { userId: order.customerId, courseId: courseToGrant.id }
          });
          
          if (!existingAccess) {
            await prisma.userCourseAccess.create({
              data: { userId: order.customerId, courseId: courseToGrant.id }
            });
            sendCoursePurchaseEmail(userEmail, userName, courseToGrant.title, item.price.toString(), order.orderNumber).catch(console.error);
          }
        }
      }
    } 
    // Revoke access if order is reverted from COMPLETED to something else (like CANCELLED or PENDING)
    else if (previousOrder.status === 'COMPLETED' && status !== 'COMPLETED' && order.customerId) {
      for (const item of order.items) {
        let courseToRevoke = null;

        if (item.product && item.product.linkedCourseId) {
          courseToRevoke = await prisma.course.findUnique({ where: { id: item.product.linkedCourseId } });
        } else if (!item.product) {
          courseToRevoke = await prisma.course.findFirst({ where: { title: item.name } });
        }

        if (courseToRevoke) {
          await prisma.userCourseAccess.deleteMany({
            where: { userId: order.customerId, courseId: courseToRevoke.id }
          });
        }
      }
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
