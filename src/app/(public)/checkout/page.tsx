// Force tailwind recompilation
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
    <div className="min-h-screen bg-[#f8f9fa] py-12">
      <div className="max-w-5xl mx-auto px-6">
        
        <div className="flex flex-col lg:flex-row gap-8 mb-8 lg:items-end">
          
          {/* Left Side Header (Matches Payment Form Width) */}
          <div className="w-full lg:w-2/3 flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center mt-1">
              <img src="/lock.svg" alt="Secure Checkout Icon" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none mb-2">Secure Checkout</h1>
              <p className="text-gray-500 text-lg">You're one step closer to your fitness goals.</p>
            </div>
          </div>
          
          {/* Right Side Progress Steps (Matches Order Summary Width) */}
          <div className="w-full lg:w-1/3 flex lg:justify-end">
            <div className="flex items-start text-xs font-bold uppercase tracking-wider">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm shadow-sm" style={{ backgroundColor: '#773dbe' }}>1</div>
                <span style={{ color: '#773dbe' }}>Account</span>
              </div>
              <div className="w-12 md:w-16 h-[2px] bg-gray-200 mt-4 mx-2"></div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm shadow-sm" style={{ backgroundColor: '#773dbe' }}>2</div>
                <span style={{ color: '#773dbe' }}>Payment</span>
              </div>
              <div className="w-12 md:w-16 h-[2px] bg-gray-200 mt-4 mx-2"></div>
              <div className="flex flex-col items-center gap-3 opacity-50">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm shadow-sm">3</div>
                <span className="text-gray-500">Review</span>
              </div>
            </div>
          </div>
          
        </div>

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
