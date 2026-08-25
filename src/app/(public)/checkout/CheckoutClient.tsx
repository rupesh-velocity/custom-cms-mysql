'use client';
// Force tailwind recompilation

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, AddressElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { BASE_PATH } from '@/lib/config';
import { CreditCard, Smartphone } from 'lucide-react';

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
  
  const [paymentMethod, setPaymentMethod] = useState<'stripe'|'zelle'>('stripe');
  const [zelleTransactionId, setZelleTransactionId] = useState('');
  
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
    setIsLoading(true);

    try {
      let paymentIntentId = undefined;

      if (paymentMethod === 'stripe') {
        if (!stripe || !elements) return;
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            receipt_email: formData.email || undefined,
            return_url: window.location.href, 
          },
          redirect: 'if_required'
        });

        if (error) {
          throw new Error(error.message || 'Payment failed');
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
          paymentIntentId = paymentIntent.id;
        } else {
          throw new Error('Payment was not successful. Status: ' + paymentIntent?.status);
        }
      } else {
        if (!zelleTransactionId.trim()) {
          throw new Error('Please enter your Zelle Transaction ID or Name.');
        }
      }

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
          paymentIntentId: paymentIntentId,
          paymentMethod: paymentMethod === 'zelle' ? 'ZELLE' : 'STRIPE',
          paymentId: paymentMethod === 'zelle' ? zelleTransactionId : undefined,
          shippingAddress: shippingAddress
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to finalize order on our servers. Please contact support.');
      }

      if (data.isPending) {
        toast.success('Order placed! Pending Zelle verification.');
      } else {
        toast.success(item.type === 'course' ? 'Enrollment successful!' : 'Payment successful!');
      }
      
      router.push('/my-account');
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .text-\\[\\#773dbe\\] { color: #773dbe !important; }
        .border-\\[\\#773dbe\\] { border-color: #773dbe !important; }
        .bg-\\[\\#773dbe\\] { background-color: #773dbe !important; }
        .ring-\\[\\#773dbe\\] { --tw-ring-color: #773dbe !important; box-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color) !important; }
        .focus\\:ring-\\[\\#773dbe\\]:focus { --tw-ring-color: #773dbe !important; }
        .focus\\:border-\\[\\#773dbe\\]:focus { border-color: #773dbe !important; }
      `}} />
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#773dbe] outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" name="email" required
                  disabled={isAuthenticated}
                  value={formData.email} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#773dbe] outline-none disabled:bg-gray-100 disabled:text-gray-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#773dbe] outline-none"
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

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="!text-sm font-semibold text-gray-700 uppercase tracking-wider !mb-4">Select Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`cursor-pointer flex items-center gap-3 p-4 border rounded-xl transition-all ${paymentMethod === 'stripe' ? 'border-[#773dbe] bg-indigo-50 ring-1 ring-[#773dbe]' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  checked={paymentMethod === 'stripe'} 
                  onChange={() => setPaymentMethod('stripe')} 
                  className="w-4 h-4 text-[#773dbe] focus:ring-[#773dbe]"
                />
                <CreditCard size={20} className={paymentMethod === 'stripe' ? 'text-[#773dbe]' : 'text-gray-400'} />
                <span className={`font-medium ${paymentMethod === 'stripe' ? 'text-[#773dbe]' : 'text-gray-700'}`}>Credit/Debit Card</span>
              </label>
              
              <label className={`cursor-pointer flex items-center gap-3 p-4 border rounded-xl transition-all ${paymentMethod === 'zelle' ? 'border-[#773dbe] bg-indigo-50 ring-1 ring-[#773dbe]' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  checked={paymentMethod === 'zelle'} 
                  onChange={() => setPaymentMethod('zelle')} 
                  className="w-4 h-4 text-[#773dbe] focus:ring-[#773dbe]"
                />
                <Smartphone size={20} className={paymentMethod === 'zelle' ? 'text-[#773dbe]' : 'text-gray-400'} />
                <span className={`font-medium ${paymentMethod === 'zelle' ? 'text-[#773dbe]' : 'text-gray-700'}`}>Pay with Zelle</span>
              </label>
            </div>

            {/* Conditional Payment UI */}
            {paymentMethod === 'stripe' ? (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 mt-4">
                <PaymentElement />
              </div>
            ) : (
              <div className="p-6 border border-[#773dbe] rounded-lg bg-indigo-50/30 mt-4 space-y-6">
                <div className="flex flex-col items-center text-center max-w-sm mx-auto">
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 flex justify-center mb-6 w-full max-w-[240px]">
                    <img src="/zelle-qr-code.png" alt="Zelle QR Code" className="w-full h-auto object-contain rounded-xl" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-xl mb-2">Manual Zelle Payment</h4>
                  <p className="text-gray-600 text-sm" style={{ marginBottom: '24px' }}>
                    To complete your order, open your banking app and send exactly <strong className="text-lg text-[#773dbe]">${item.price}</strong> via Zelle to:
                  </p>
                  <div className="bg-white px-6 py-4 rounded-xl border-2 border-dashed border-[#773dbe] font-mono text-2xl font-bold text-gray-900 shadow-sm w-full tracking-widest" style={{ marginBottom: '24px' }}>
                    520-440-5326
                  </div>
                  <p className="text-gray-500 text-xs italic">
                    Tip: You can easily scan the QR code above using your Zelle app to auto-fill the details.
                  </p>
                </div>
                
                <hr className="border-gray-200" />
                
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-bold text-gray-900 mb-3 text-center">I have sent the money. My Zelle Transaction ID or Name is:</label>
                  <input 
                    type="text" 
                    required={paymentMethod === 'zelle'}
                    value={zelleTransactionId} 
                    onChange={(e) => setZelleTransactionId(e.target.value)}
                    className="w-full px-4 py-3 text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#773dbe] focus:border-[#773dbe] outline-none text-lg transition-all"
                    placeholder="e.g. 123456789 or John Doe"
                  />
                  <p className="text-xs text-gray-500 mt-3 text-center leading-relaxed">
                    Your order will remain pending until we manually verify the transfer. You will receive an email once approved.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isLoading || (paymentMethod === 'stripe' && (!stripe || !elements)) || (item.type === 'product' && !shippingAddress)}
            className="w-full py-3 px-6 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-6"
            style={{ backgroundColor: '#773dbe' }}
          >
            {isLoading ? 'Processing...' : paymentMethod === 'stripe' ? `Pay $${item.price} Now` : `Complete Order ($${item.price})`}
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
              <p className="text-[#773dbe] font-bold mt-1">${item.price}</p>
            </div>
          </div>
          <hr className="border-gray-100 mb-4" />
          <div className="flex justify-between items-center text-lg font-bold text-gray-900 mb-2">
            <span>Total</span>
            <span>${item.price}</span>
          </div>
          {paymentMethod === 'stripe' ? (
            <p className="text-xs text-gray-500 mt-4 text-center">
              Secured by Stripe.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-4 text-center">
              Manual Zelle Transfer.
            </p>
          )}
        </div>
      </div>
    </div>
    </>
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#773dbe]"></div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <CheckoutForm {...props} clientSecret={clientSecret} allowedCountries={allowedCountries} />
    </Elements>
  );
}
