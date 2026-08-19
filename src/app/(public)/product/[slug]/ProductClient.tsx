'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ProductClient({ productId }: { productId: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handlePurchase = () => {
    setIsLoading(true);
    router.push(`/checkout?productId=${productId}`);
  };

  return (
    <button
      onClick={handlePurchase}
      disabled={isLoading}
      className="w-full md:w-auto px-8 py-3 bg-[#5e3fde] text-white rounded-lg font-medium text-lg hover:bg-[#4b32b2] disabled:opacity-50 transition-colors shadow-sm shadow-[#5e3fde]/20"
    >
      {isLoading ? 'Processing...' : 'Buy Now (Mock Checkout)'}
    </button>
  );
}
