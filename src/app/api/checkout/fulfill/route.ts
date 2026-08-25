import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { sendCoursePurchaseEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { itemId, type, name, email, password, paymentIntentId, shippingAddress, paymentMethod, paymentId } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    // Verify Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('cms_session')?.value;
    
    let userId: number | null = null;
    let userEmail: string = email || '';
    let userName: string = name || '';
    
    if (token) {
      try {
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
        );
        const { payload } = await jwtVerify(token, secret);
        userId = payload.id as number;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          userEmail = user.email;
          userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail;
        }
      } catch (error) {
        // invalid token
      }
    }
    
    let isNewUser = false;

    // Create user if not logged in
    if (!userId) {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required for checkout.' }, { status: 400 });
      }
      
      // Check if user already exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          username: email,
          email,
          password: hashedPassword,
          firstName: name?.split(' ')[0] || '',
          lastName: name?.split(' ').slice(1).join(' ') || '',
          role: 'Customer'
        }
      });
      userId = newUser.id;
      isNewUser = true;
    }

    let responseData: any = { success: true };
    const isZelle = paymentMethod === 'ZELLE';
    const orderStatus = isZelle ? 'PENDING' : 'COMPLETED';

    if (type === 'course') {
      const course = await prisma.course.findUnique({ where: { id: parseInt(itemId) } });
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const amountPaid = course.salePrice || course.price || 0;
      const generatedOrderNumber = `#${Math.floor(100000 + Math.random() * 900000)}`;
      
      // CREATE ORDER
      const order = await prisma.order.create({
        data: {
          customerId: userId,
          customerEmail: userEmail,
          orderNumber: generatedOrderNumber,
          status: orderStatus,
          paymentMethod: paymentMethod || 'STRIPE',
          paymentId: paymentId || paymentIntentId || null,
          totalAmount: amountPaid,
          billingAddress: '{}',
          shippingAddress: '{}',
          items: {
            create: [{
              name: course.title,
              quantity: 1,
              price: amountPaid,
              total: amountPaid
            }]
          }
        }
      });

      // ONLY GRANT ACCESS IF NOT ZELLE (OR IF FREE COURSE WITH ZELLE)
      if (!isZelle || amountPaid === 0) {
        const existingAccess = await prisma.userCourseAccess.findFirst({
          where: { userId: userId, courseId: course.id }
        });
        
        if (!existingAccess) {
          await prisma.userCourseAccess.create({
            data: { userId: userId, courseId: course.id }
          });
          
          // Send notification email asynchronously
          sendCoursePurchaseEmail(userEmail, userName, course.title, amountPaid > 0 ? amountPaid.toString() : "Free", generatedOrderNumber).catch(console.error);
        }
      }
      responseData.enrollmentId = course.id;
      responseData.orderId = order.id;
      responseData.isPending = isZelle;
    } else {
      const product = await prisma.product.findUnique({ where: { id: parseInt(itemId) } });
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      const generatedOrderNumber = `#${Math.floor(100000 + Math.random() * 900000)}`;

      const order = await prisma.order.create({
        data: {
          customerId: userId,
          customerEmail: userEmail,
          orderNumber: generatedOrderNumber,
          status: orderStatus,
          paymentMethod: paymentMethod || 'STRIPE',
          paymentId: paymentId || paymentIntentId || null,
          totalAmount: product.salePrice || product.price || 0,
          billingAddress: JSON.stringify(shippingAddress || {}),
          shippingAddress: JSON.stringify(shippingAddress || {}),
          items: {
            create: [{
              productId: product.id,
              name: product.title,
              quantity: 1,
              price: product.salePrice || product.price || 0,
              total: product.salePrice || product.price || 0
            }]
          }
        }
      });

      // ONLY GRANT ACCESS IF NOT ZELLE
      if (!isZelle && product.linkedCourseId) {
        const existingAccess = await prisma.userCourseAccess.findFirst({
          where: { userId: userId, courseId: product.linkedCourseId }
        });
        
        if (!existingAccess) {
          await prisma.userCourseAccess.create({
            data: { userId: userId, courseId: product.linkedCourseId }
          });
          
          const linkedCourse = await prisma.course.findUnique({ where: { id: product.linkedCourseId } });
          if (linkedCourse) {
            sendCoursePurchaseEmail(userEmail, userName, linkedCourse.title, (product.salePrice || product.price || 0).toString(), order.orderNumber).catch(console.error);
          }
        }
      }
      responseData.orderId = order.id;
      responseData.isPending = isZelle;
    }

    const response = NextResponse.json(responseData);

    // Set cookie if we just created a new user
    if (isNewUser && userId) {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
      );
      const newToken = await new SignJWT({ id: userId, role: 'Subscriber' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .sign(secret);
        
      response.cookies.set('cms_session', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 1 day
      });
    }

    return response;
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
