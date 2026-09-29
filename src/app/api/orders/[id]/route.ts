import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { sendCoursePurchaseEmail } from '@/lib/email';
import { addMonths } from '@/lib/course-access';

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
    const orderId = parseInt(resolvedParams.id, 10);
    const { status } = await req.json();

    const previousOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!previousOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: {
          include: {
            product: true,
            course: true,
            courseAccessPlan: true,
          },
        },
        customer: true,
      },
    });

    // If a pending/manual order is approved, grant course access here.
    // This is required for Zelle because checkout creates the order as PENDING
    // and intentionally does not grant access until admin verification.
    if (previousOrder.status !== 'COMPLETED' && status === 'COMPLETED' && order.customerId) {
      const userEmail = order.customerEmail;
      const userName = order.customer
        ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || userEmail
        : userEmail;

      for (const item of order.items) {
        let courseToGrant = item.course || null;
        let accessPlan = item.courseAccessPlan || null;

        if (!courseToGrant && item.product?.linkedCourseId) {
          courseToGrant = await prisma.course.findUnique({ where: { id: item.product.linkedCourseId } });
        }

        // Backward compatibility for older course orders that only stored the course name.
        if (!courseToGrant && !item.productId) {
          courseToGrant = await prisma.course.findFirst({ where: { title: item.name } });
        }

        if (!courseToGrant) continue;

        const startsAt = new Date();
        const expiresAt = accessPlan ? addMonths(startsAt, accessPlan.durationMonths) : null;

        await prisma.userCourseAccess.upsert({
          where: {
            userId_courseId: {
              userId: order.customerId,
              courseId: courseToGrant.id,
            },
          },
          update: {
            courseAccessPlanId: accessPlan?.id || null,
            startsAt,
            expiresAt,
            source: order.paymentMethod === 'ZELLE' ? 'online' : 'online',
            orderId: order.id,
            adminNote: order.paymentMethod === 'ZELLE' ? 'Granted after Zelle verification.' : null,
          },
          create: {
            userId: order.customerId,
            courseId: courseToGrant.id,
            courseAccessPlanId: accessPlan?.id || null,
            startsAt,
            expiresAt,
            source: order.paymentMethod === 'ZELLE' ? 'online' : 'online',
            orderId: order.id,
            adminNote: order.paymentMethod === 'ZELLE' ? 'Granted after Zelle verification.' : null,
          },
        });

        sendCoursePurchaseEmail(
          userEmail,
          userName,
          item.name || courseToGrant.title,
          item.price.toString(),
          order.orderNumber
        ).catch(console.error);
      }
    }
    // Revoke access if order is reverted from COMPLETED to another status.
    else if (previousOrder.status === 'COMPLETED' && status !== 'COMPLETED' && order.customerId) {
      for (const item of order.items) {
        let courseToRevoke = item.course || null;

        if (!courseToRevoke && item.product?.linkedCourseId) {
          courseToRevoke = await prisma.course.findUnique({ where: { id: item.product.linkedCourseId } });
        }

        if (!courseToRevoke && !item.productId) {
          courseToRevoke = await prisma.course.findFirst({ where: { title: item.name } });
        }

        if (courseToRevoke) {
          await prisma.userCourseAccess.deleteMany({
            where: {
              userId: order.customerId,
              courseId: courseToRevoke.id,
              orderId: order.id,
            },
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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const orderId = parseInt(resolvedParams.id, 10);

    if (!Number.isFinite(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // If this order granted course access, remove only access records tied to this order.
      await tx.userCourseAccess.deleteMany({ where: { orderId } });
      await tx.order.delete({ where: { id: orderId } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete order error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
