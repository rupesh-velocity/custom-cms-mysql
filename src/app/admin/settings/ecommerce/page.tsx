'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, CreditCard, Truck, FileImage, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import MediaModal from '@/components/MediaModal';
import Image from 'next/image';
import { countries } from '@/lib/countries';
import { currencies } from '@/lib/currencies';
import { X } from 'lucide-react';
import ShippingZonesManager from './ShippingZonesManager';
import TaxManager from './TaxManager';
import { BASE_PATH } from '@/lib/config';

export default function EcommerceSettingsPage() {
  const [settings, setSettings] = useState({
    stripeEnabled: 'false',
    stripeMode: 'test',
    stripeTestPublicKey: '',
    stripeTestSecretKey: '',
    stripeLivePublicKey: '',
    stripeLiveSecretKey: '',
    paypalEnabled: 'false',
    paypalClientId: '',
    currency: 'USD',
    adminEmail: '',
    storeAddress1: '',
    storeAddress2: '',
    storeCity: '',
    storeState: '',
    storeZip: '',
    storeCountry: 'US',
    sellingLocation: 'all',
    specificSellingCountries: '[]',
    storePhone: '',
    storePublicEmail: '',
    enableTaxes: 'false',
    emailSenderName: '',
    emailLogoUrl: '',
    emailPrimaryColor: '#5e3fde',
    emailSubjectSuccess: 'Your receipt for {courseName}',
    emailSubjectFailed: 'Payment Failed: {courseName}',
    emailSubjectCancelled: 'Order Cancelled: {courseName}',
    emailTemplateSuccess: '',
    emailTemplateFailed: '',
    emailTemplateCancelled: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BASE_PATH}/api/settings/ecommerce`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/settings/ecommerce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success('E-commerce settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings(s => ({ ...s, [name]: checked ? 'true' : 'false' }));
    } else {
      setSettings(s => ({ ...s, [name]: value }));
    }
  };

  const handleMediaInsert = (url: string) => {
    setSettings(s => ({ ...s, emailLogoUrl: url }));
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div className="relative max-w-[1200px] text-[#2c3338]">
      <MediaModal 
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onInsert={handleMediaInsert}
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-normal">Settings</h1>
      </div>

      {/* WooCommerce style horizontal tabs */}
      <div className="flex border-b border-[#c3c4c7] mb-6 overflow-x-auto scrollbar-hide">
        {['General', 'Shipping'].map(tab => (
          <button
            type="button"
            key={tab.toLowerCase()}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`px-4 py-2 text-[14px] font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.toLowerCase() 
                ? 'text-[#5e3fde] border-b-2 border-[#5e3fde] -mb-[1px]' 
                : 'text-gray-600 hover:text-[#5e3fde]'
            }`}
          >
            {tab}
          </button>
        ))}

        {(settings as any).enableTaxes === 'true' && (
          <button
            type="button"
            onClick={() => setActiveTab('taxes')}
            className={`px-4 py-2 text-[14px] font-medium whitespace-nowrap transition-colors ${
              activeTab === 'taxes'
                ? 'text-[#5e3fde] border-b-2 border-[#5e3fde] -mb-[1px]' 
                : 'text-gray-600 hover:text-[#5e3fde]'
            }`}
          >
            Taxes
          </button>
        )}

        {['Payments', 'Emails'].map(tab => {
          const tabId = tab.toLowerCase();
          const displayActiveTab = activeTab === 'payments' ? 'payments' : activeTab;
          
          return (
            <button
              type="button"
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`px-4 py-2 text-[14px] font-medium whitespace-nowrap transition-colors ${
                displayActiveTab === tabId 
                  ? 'text-[#5e3fde] border-b-2 border-[#5e3fde] -mb-[1px]' 
                  : 'text-gray-600 hover:text-[#5e3fde]'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-[#c3c4c7] p-8">
        {activeTab === 'general' && (
          <div className="space-y-8">
            <h2 className="text-lg font-semibold border-b border-gray-100 pb-2 mb-4">Store Address</h2>
            <p className="text-[13px] text-gray-500 mb-6">This is where your business is located. Tax rates and shipping rates will use this address.</p>
            
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-[13px] font-semibold text-gray-700">Address line 1</label>
              <input type="text" name="storeAddress1" value={(settings as any).storeAddress1 || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none" placeholder="e.g. 123 Main St" />
            </div>
            
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-[13px] font-semibold text-gray-700">Address line 2</label>
              <input type="text" name="storeAddress2" value={(settings as any).storeAddress2 || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none" placeholder="Apartment, suite, unit etc. (optional)" />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-[13px] font-semibold text-gray-700">City</label>
              <input type="text" name="storeCity" value={(settings as any).storeCity || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none" />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-[13px] font-semibold text-gray-700">State / Province</label>
              <input type="text" name="storeState" value={(settings as any).storeState || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none" />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-[13px] font-semibold text-gray-700">ZIP / Postal Code</label>
              <input type="text" name="storeZip" value={(settings as any).storeZip || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-[150px] focus:border-[#5e3fde] outline-none" />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-[13px] font-semibold text-gray-700">Country</label>
              <select
                name="storeCountry"
                value={(settings as any).storeCountry || 'US'}
                onChange={handleChange}
                className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none"
              >
                {countries.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <h2 className="text-lg font-semibold border-b border-gray-100 pb-2 mb-4 mt-8 pt-4">General Options</h2>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center mb-6">
              <label className="text-[13px] font-semibold text-gray-700">Selling location(s)</label>
              <select
                name="sellingLocation"
                value={(settings as any).sellingLocation || 'all'}
                onChange={handleChange}
                className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none"
              >
                <option value="all">Sell to all countries</option>
                <option value="specific">Sell to specific countries</option>
              </select>
            </div>

            {(settings as any).sellingLocation === 'specific' && (
              <div className="grid grid-cols-[200px_1fr] gap-4 items-start mb-6">
                <label className="text-[13px] font-semibold text-gray-700">Specific countries</label>
                <div className="flex flex-col gap-2 w-full max-w-md">
                  <select
                    multiple
                    value={JSON.parse((settings as any).specificSellingCountries || '[]')}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setSettings(s => ({ ...s, specificSellingCountries: JSON.stringify(selected) }));
                    }}
                    className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full focus:border-[#5e3fde] outline-none min-h-[150px]"
                  >
                    {countries.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500">Hold Ctrl (Windows) or Cmd (Mac) to select multiple countries.</div>
                  
                  {/* Selected Countries Display */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {JSON.parse((settings as any).specificSellingCountries || '[]').map((code: string) => {
                      const countryName = countries.find(c => c.code === code)?.name || code;
                      return (
                        <div key={code} className="inline-flex items-center gap-1 bg-[#5e3fde]/10 text-[#5e3fde] px-2 py-1 rounded text-xs font-medium">
                          {countryName}
                          <button 
                            type="button" 
                            onClick={() => {
                              const current = JSON.parse((settings as any).specificSellingCountries || '[]');
                              setSettings(s => ({ ...s, specificSellingCountries: JSON.stringify(current.filter((c: string) => c !== code)) }));
                            }}
                            className="hover:text-[#4b32b2] ml-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <h2 className="text-lg font-semibold border-b border-gray-100 pb-2 mb-4 mt-8 pt-4">Store Contact Info</h2>
            <p className="text-[13px] text-gray-500 mb-6">This information may be displayed to customers on receipts or your contact page.</p>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-[13px] font-semibold text-gray-700">Public Email Address</label>
              <input type="email" name="storePublicEmail" value={(settings as any).storePublicEmail || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none" placeholder="support@yourdomain.com" />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-[13px] font-semibold text-gray-700">Phone Number</label>
              <input type="text" name="storePhone" value={(settings as any).storePhone || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none" />
            </div>
            
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center pt-8 border-t border-gray-100 mt-4">
              <label className="text-[13px] font-semibold text-gray-700">Taxes</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="enableTaxes" checked={(settings as any).enableTaxes === 'true'} onChange={handleChange} className="w-4 h-4 rounded text-[#5e3fde] focus:ring-[#5e3fde]" />
                <span className="text-[13px] text-gray-700">Enable taxes and tax calculations</span>
              </label>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start pt-4 border-t border-gray-100">
              <label className="text-[13px] font-semibold text-gray-700">Currency</label>
              <div>
                <select
                  name="currency"
                  value={settings.currency}
                  onChange={handleChange}
                  className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-xs focus:border-[#5e3fde] outline-none"
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">This determines what currency your store operates in.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-8">
            <p className="text-[13px] text-gray-500 mb-6">Installed payment methods are listed below. Drag and drop to control their display order on the frontend.</p>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-[13px] font-semibold text-gray-700">Method</th>
                  <th className="py-2 text-[13px] font-semibold text-gray-700">Enabled</th>
                  <th className="py-2 text-[13px] font-semibold text-gray-700">Keys</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                <tr className="border-b border-gray-100">
                  <td className="py-4 font-medium flex items-center gap-2"><CreditCard size={16} className="text-gray-400" /> Stripe</td>
                  <td className="py-4">
                    <input type="checkbox" name="stripeEnabled" checked={settings.stripeEnabled === 'true'} onChange={handleChange} className="w-4 h-4 rounded text-[#5e3fde] focus:ring-[#5e3fde]" />
                  </td>
                  <td className="py-4 space-y-4">
                    {/* Stripe Mode Toggle */}
                    <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <span className="font-semibold text-gray-700">Mode:</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="stripeMode" value="test" checked={settings.stripeMode === 'test'} onChange={handleChange} className="text-[#5e3fde] focus:ring-[#5e3fde]" />
                        <span>Test Mode</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="stripeMode" value="live" checked={settings.stripeMode === 'live'} onChange={handleChange} className="text-[#5e3fde] focus:ring-[#5e3fde]" />
                        <span>Live Mode</span>
                      </label>
                    </div>

                    <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Test Credentials</p>
                      <input type="text" name="stripeTestPublicKey" value={(settings as any).stripeTestPublicKey || ''} onChange={handleChange} placeholder="Test Publishable Key (pk_test_...)" autoComplete="off" className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 w-full max-w-sm block focus:border-[#5e3fde] outline-none font-mono text-xs" />
                      <input type="text" name="stripeTestSecretKey" value={(settings as any).stripeTestSecretKey || ''} onChange={handleChange} placeholder="Test Secret Key (sk_test_...)" autoComplete="off" className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 w-full max-w-sm block focus:border-[#5e3fde] outline-none font-mono text-xs" />
                    </div>

                    <div className="space-y-2 pl-2 border-l-2 border-[#5e3fde]/30">
                      <p className="text-xs font-semibold text-[#5e3fde] uppercase tracking-wider">Live Credentials</p>
                      <input type="text" name="stripeLivePublicKey" value={(settings as any).stripeLivePublicKey || ''} onChange={handleChange} placeholder="Live Publishable Key (pk_live_...)" autoComplete="off" className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 w-full max-w-sm block focus:border-[#5e3fde] outline-none font-mono text-xs" />
                      <input type="text" name="stripeLiveSecretKey" value={(settings as any).stripeLiveSecretKey || ''} onChange={handleChange} placeholder="Live Secret Key (sk_live_...)" autoComplete="off" className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 w-full max-w-sm block focus:border-[#5e3fde] outline-none font-mono text-xs" />
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 font-medium">PayPal</td>
                  <td className="py-4">
                    <input type="checkbox" name="paypalEnabled" checked={settings.paypalEnabled === 'true'} onChange={handleChange} className="w-4 h-4 rounded text-[#5e3fde] focus:ring-[#5e3fde]" />
                  </td>
                  <td className="py-4">
                    <input type="text" name="paypalClientId" value={settings.paypalClientId} onChange={handleChange} placeholder="Client ID" className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 w-full max-w-xs block focus:border-[#5e3fde] outline-none" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'shipping' && (
          <ShippingZonesManager />
        )}

        {activeTab === 'taxes' && (settings as any).enableTaxes === 'true' && (
          <TaxManager />
        )}

        {activeTab === 'emails' && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Email Notifications</h2>
            <p className="text-[13px] text-gray-500 mb-6">Manage how and where order notifications are sent.</p>
            
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <label className="text-[13px] font-semibold text-gray-700">Admin Email Address</label>
              <input type="email" name="adminEmail" value={(settings as any).adminEmail || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none" placeholder="orders@yourdomain.com" />
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-md font-semibold mb-4">Email Customization</h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                  <label className="text-[13px] font-semibold text-gray-700">Sender Name ("From")</label>
                  <input type="text" name="emailSenderName" value={(settings as any).emailSenderName || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none" placeholder="e.g. Fitness Arts Team" />
                </div>
                
                <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                  <label className="text-[13px] font-semibold text-gray-700 mt-2">Email Logo</label>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden relative group">
                      {(settings as any).emailLogoUrl ? (
                        <img src={(settings as any).emailLogoUrl} alt="Email Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <ImageIcon className="text-gray-300" size={32} />
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsMediaModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors mb-2"
                      >
                        <FileImage size={16} /> Choose Logo
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings(s => ({ ...s, emailLogoUrl: '' }))}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove Logo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                  <label className="text-[13px] font-semibold text-gray-700">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" name="emailPrimaryColor" value={(settings as any).emailPrimaryColor || '#5e3fde'} onChange={handleChange} className="h-8 w-8 cursor-pointer border-0 p-0 rounded" />
                    <input type="text" name="emailPrimaryColor" value={(settings as any).emailPrimaryColor || '#5e3fde'} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-28 focus:border-[#5e3fde] outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-md font-semibold mb-2">Email Templates</h3>
              <p className="text-[13px] text-gray-500 mb-6">
                Use placeholders: <code>{`{courseName}`}</code>, <code>{`{amount}`}</code>, <code>{`{customerName}`}</code>
              </p>
              
              <div className="space-y-10">
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                  <h4 className="font-semibold text-sm mb-4">Successful Purchase</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1">Subject Line</label>
                      <input type="text" name="emailSubjectSuccess" value={(settings as any).emailSubjectSuccess || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-2xl focus:border-[#5e3fde] outline-none" placeholder="Your receipt for {courseName}" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1">Message Body</label>
                      <textarea 
                        name="emailTemplateSuccess" 
                        value={(settings as any).emailTemplateSuccess || ''} 
                        onChange={handleChange} 
                        rows={4}
                        className="border border-[#8c8f94] rounded-[3px] px-3 py-2 text-[13px] w-full max-w-2xl focus:border-[#5e3fde] outline-none" 
                        placeholder="Your purchase of {courseName} was successful. You now have full access to this course." 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                  <h4 className="font-semibold text-sm mb-4">Failed Order</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1">Subject Line</label>
                      <input type="text" name="emailSubjectFailed" value={(settings as any).emailSubjectFailed || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-2xl focus:border-[#5e3fde] outline-none" placeholder="Payment Failed: {courseName}" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1">Message Body</label>
                      <textarea 
                        name="emailTemplateFailed" 
                        value={(settings as any).emailTemplateFailed || ''} 
                        onChange={handleChange} 
                        rows={4}
                        className="border border-[#8c8f94] rounded-[3px] px-3 py-2 text-[13px] w-full max-w-2xl focus:border-[#5e3fde] outline-none" 
                        placeholder="Unfortunately, your payment of ${amount} for {courseName} failed. Please try again." 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                  <h4 className="font-semibold text-sm mb-4">Cancelled/Refunded Order</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1">Subject Line</label>
                      <input type="text" name="emailSubjectCancelled" value={(settings as any).emailSubjectCancelled || ''} onChange={handleChange} className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-2xl focus:border-[#5e3fde] outline-none" placeholder="Order Cancelled: {courseName}" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1">Message Body</label>
                      <textarea 
                        name="emailTemplateCancelled" 
                        value={(settings as any).emailTemplateCancelled || ''} 
                        onChange={handleChange} 
                        rows={4}
                        className="border border-[#8c8f94] rounded-[3px] px-3 py-2 text-[13px] w-full max-w-2xl focus:border-[#5e3fde] outline-none" 
                        placeholder="Your order for {courseName} has been cancelled and refunded." 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-[#5e3fde] text-white rounded-[3px] text-[13px] font-medium hover:bg-[#4b32b2] disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save changes
        </button>
      </div>
    </div>
  );
}
