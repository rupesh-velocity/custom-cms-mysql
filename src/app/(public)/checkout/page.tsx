import { prisma } from '@/lib/prisma';
import CheckoutClient from './CheckoutClient';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ id?: string, type?: string, productId?: string }> }) {
  const params = await searchParams;
  
  const id = params?.id || params.productId;
  const type = params.type || 'product';

  if (!id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Invalid Checkout Link</h1>
        <p className="text-gray-500">No item was specified for checkout.</p>
      </div>
    );
  }
  
  let itemData: any = null;

  if (type === 'course') {
    const course = await prisma.course.findUnique({ where: { id: parseInt(id) } });
    if (course) {
      itemData = {
        id: course.id,
        title: course.title,
        price: course.salePrice || course.price || 0,
        image: course.featuredImage,
        type: 'course'
      };
    }
  } else {
    const product = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (product) {
      itemData = {
        id: product.id,
        title: product.title,
        price: product.salePrice || product.price || 0,
        image: product.featuredImage,
        type: 'product'
      };
    }
  }

  if (!itemData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Item Not Found</h1>
        <p className="text-gray-500">The item you are trying to purchase does not exist.</p>
      </div>
    );
  }
  
  // Check auth
  const cookieStore = await cookies();
  const token = cookieStore.get('cms_session')?.value;
  let userEmail = '';
  let userName = '';
  
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production');
      const { payload } = await jwtVerify(token, secret);
      const user = await prisma.user.findUnique({ where: { id: payload.id as number }});
      if (user) {
        userEmail = user.email;
        userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username;
      }
    } catch (e) {}
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Secure Checkout</h1>
        <CheckoutClient 
          item={itemData}
          isAuthenticated={!!userEmail}
          initialEmail={userEmail}
          initialName={userName}
        />
      </div>
    </div>
  );
}
