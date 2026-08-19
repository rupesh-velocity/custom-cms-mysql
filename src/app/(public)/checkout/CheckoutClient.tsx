'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, AddressElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { BASE_PATH } from '@/lib/config';

interface ItemData {
  id: number;
  title: string;
  price: number;
  image: string | null;
  type: 'course' | 'product';
}

interface CheckoutClientProps {
  item: ItemData;
  isAuthenticated: boolean;
  initialEmail: string;
  initialName: string;
}

function CheckoutForm({ item, isAuthenticated, initialEmail, initialName, clientSecret, allowedCountries }: CheckoutClientProps & { clientSecret: string, allowedCountries?: string[] }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: initialName,
    email: initialEmail,
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);

    try {
      // 1. Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          receipt_email: formData.email || undefined,
          return_url: window.location.href, // Added this back in securely!
        },
        redirect: 'if_required'
      });

      if (error) {
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // 2. Fulfill the order locally
        const res = await fetch(`${BASE_PATH}/api/checkout/fulfill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            itemId: item.id,
            type: item.type,
            name: formData.name,
            email: formData.email,
            password: formData.password,
            paymentIntentId: paymentIntent.id,
            shippingAddress: shippingAddress
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to finalize order on our servers, but payment succeeded. Please contact support.');
        }

        toast.success(item.type === 'course' ? 'Enrollment successful!' : 'Payment successful!');
        router.push('/my-account');
      } else {
        throw new Error('Payment was not successful. Status: ' + paymentIntent?.status);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 !mt-6">
      {/* Checkout Form */}
      <div className="w-full lg:w-2/3 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="!text-2xl font-bold text-gray-900 !mb-6">Payment Details</h2>
        <form onSubmit={handleCheckout} className="space-y-6">
          
          {/* Account Details */}
          <div className="space-y-4">
            <h3 className="!text-sm font-semibold text-gray-700 uppercase tracking-wider !mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" name="name" required
                  value={formData.name} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e3fde] outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" name="email" required
                  disabled={isAuthenticated}
                  value={formData.email} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e3fde] outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="john@example.com"
                />
              </div>
            </div>
            
            {!isAuthenticated && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Create a Password (to access your {item.type} later)</label>
                <input 
                  type="password" name="password" required
                  value={formData.password} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e3fde] outline-none"
                  placeholder="••••••••"
                />
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {item.type === 'product' && (
            <>
              <div className="space-y-4">
                <h3 className="!text-sm font-semibold text-gray-700 uppercase tracking-wider !mb-4">Shipping Address</h3>
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <AddressElement 
                    options={{ 
                      mode: 'shipping', 
                      allowedCountries: allowedCountries 
                    }} 
                    onChange={(event) => {
                      if (event.complete) {
                        setShippingAddress(event.value.address);
                      } else {
                        setShippingAddress(null);
                      }
                    }}
                  />
                </div>
              </div>
              <hr className="border-gray-100" />
            </>
          )}

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="!text-sm font-semibold text-gray-700 uppercase tracking-wider !mb-4">Payment Details</h3>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <PaymentElement />
            </div>
          </div>

          <button 
            type="submit" disabled={isLoading || !stripe || !elements || (item.type === 'product' && !shippingAddress)}
            className="w-full py-3 px-6 bg-[#5e3fde] text-white font-bold rounded-lg hover:bg-[#4b32b2] transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : `Pay $${item.price} Now`}
          </button>
        </form>
      </div>

      {/* Order Summary */}
      <div className="w-full lg:w-1/3">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-24">
          <h2 className="!text-xl font-bold text-gray-900 !mb-4">Order Summary</h2>
          <div className="flex gap-4 items-start mb-6">
            <div className="w-20 h-20 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden relative border border-gray-200">
              {item.image ? (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="!text-base font-semibold text-gray-900 break-words">{item.title}</h3>
              <p className="text-[#5e3fde] font-bold mt-1">${item.price}</p>
            </div>
          </div>
          <hr className="border-gray-100 mb-4" />
          <div className="flex justify-between items-center text-lg font-bold text-gray-900">
            <span>Total</span>
            <span>${item.price}</span>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Secured by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutClient(props: CheckoutClientProps) {
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [allowedCountries, setAllowedCountries] = useState<string[] | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${BASE_PATH}/api/checkout/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: props.item.id, type: props.item.type })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setClientSecret(data.clientSecret);
          setAllowedCountries(data.allowedCountries);
          setStripePromise(loadStripe(data.publishableKey));
        }
      })
      .catch(() => setError('Failed to initialize payment system'));
  }, [props.item.id, props.item.type]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center">
        <h3 className="font-bold text-lg mb-2">Checkout Unavailable</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5e3fde]"></div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <CheckoutForm {...props} clientSecret={clientSecret} allowedCountries={allowedCountries} />
    </Elements>
  );
}