import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

interface LocalSeoTabProps {
  settings: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  toggleBoolean: (key: string) => void;
  openMediaModal: (key: string) => void;
}

export default function LocalSeoTab({ settings, handleChange, toggleBoolean, openMediaModal }: LocalSeoTabProps) {
  // Helpers for JSON fields
  const getJsonSetting = (key: string, defaultValue: any) => {
    try {
      const val = settings[key];
      return val && val.trim() !== '' ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const setJsonSetting = (key: string, value: any) => {
    handleChange(key, JSON.stringify(value));
  };

  const [pages, setPages] = useState<{ id: number, title: string, slug: string }[]>([]);
  const [siteUrl, setSiteUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.origin);
    }
    fetch(`${BASE_PATH}/api/pages`)
      .then(res => res.json())
      .then(data => setPages(data || []))
      .catch(() => {});
  }, []);

  // Address State
  const address = getJsonSetting('seo_local_address', { streetAddress: '', addressLocality: '', addressRegion: '', postalCode: '', addressCountry: '' });
  const updateAddress = (field: string, val: string) => {
    setJsonSetting('seo_local_address', { ...address, [field]: val });
  };

  // Opening Hours State
  const openingHours = getJsonSetting('seo_local_opening_hours', []);
  const addOpeningHour = () => {
    setJsonSetting('seo_local_opening_hours', [...openingHours, { day: 'Monday', timeStart: '09:00', timeEnd: '17:00' }]);
  };
  const updateOpeningHour = (index: number, field: string, val: string) => {
    const newHours = [...openingHours];
    newHours[index][field] = val;
    setJsonSetting('seo_local_opening_hours', newHours);
  };
  const removeOpeningHour = (index: number) => {
    const newHours = [...openingHours];
    newHours.splice(index, 1);
    setJsonSetting('seo_local_opening_hours', newHours);
  };

  // Phones State
  const phones = getJsonSetting('seo_local_phones', []);
  const addPhone = () => {
    setJsonSetting('seo_local_phones', [...phones, { type: 'Customer Service', number: '' }]);
  };
  const updatePhone = (index: number, field: string, val: string) => {
    const newPhones = [...phones];
    newPhones[index][field] = val;
    setJsonSetting('seo_local_phones', newPhones);
  };
  const removePhone = (index: number) => {
    const newPhones = [...phones];
    newPhones.splice(index, 1);
    setJsonSetting('seo_local_phones', newPhones);
  };

  // Additional Info State
  const additionalInfo = getJsonSetting('seo_local_additional_info', []);
  const addAdditionalInfo = () => {
    setJsonSetting('seo_local_additional_info', [...additionalInfo, { key: '', value: '' }]);
  };
  const updateAdditionalInfo = (index: number, field: string, val: string) => {
    const newInfo = [...additionalInfo];
    newInfo[index][field] = val;
    setJsonSetting('seo_local_additional_info', newInfo);
  };
  const removeAdditionalInfo = (index: number) => {
    const newInfo = [...additionalInfo];
    newInfo.splice(index, 1);
    setJsonSetting('seo_local_additional_info', newInfo);
  };

  const LabelCol = ({ title, subtitle }: { title: string, subtitle?: string }) => (
    <div className="w-1/3 pr-8 pt-2 border-r border-gray-100">
      <label className="block text-[14px] font-bold text-gray-800">{title}</label>
      {subtitle && <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-[20px] font-bold text-gray-900 mb-1">Local SEO</h2>
        <p className="text-[14px] text-gray-500">Provide relevant details of your company to include in the Organization Schema. <a href="#" className="text-[#5e3fde] hover:underline">Learn more</a>.</p>
      </div>

      <div className="w-full bg-white rounded shadow-sm border border-gray-200">

      <div className="p-0">
        {/* Person or Company */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Person or Company" subtitle="Choose whether the site represents a person or an organization." />
          <div className="w-2/3 pl-8">
            <div className="flex items-center gap-4 bg-gray-100 p-1 w-max rounded border border-gray-200 shadow-inner">
              <button 
                onClick={() => handleChange('seo_local_type', 'person')}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${settings.seo_local_type === 'person' ? 'bg-[#0085ba] text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Person
              </button>
              <button 
                onClick={() => handleChange('seo_local_type', 'organization')}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${settings.seo_local_type !== 'person' ? 'bg-[#0085ba] text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Organization
              </button>
            </div>
          </div>
        </div>

        {/* Website Name */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Name" subtitle="Enter the name of your site to appear in search results." />
          <div className="w-2/3 pl-8">
            <input type="text" value={settings.seo_local_website_name || ''} onChange={(e) => handleChange('seo_local_website_name', e.target.value)} className="w-full max-w-lg border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
          </div>
        </div>

        {/* Website Alternate Name */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Alternate Name" subtitle="An alternate version of your site name (for example, an acronym or shorter name)." />
          <div className="w-2/3 pl-8">
            <input type="text" value={settings.seo_local_website_alt_name || ''} onChange={(e) => handleChange('seo_local_website_alt_name', e.target.value)} className="w-full max-w-lg border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
          </div>
        </div>

        {/* Person/Organization Name */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Person/Organization Name" subtitle="Your name or company name to include in Knowledge Graph. Needs to match the selected type." />
          <div className="w-2/3 pl-8">
            <input type="text" value={settings.seo_local_org_name || ''} onChange={(e) => handleChange('seo_local_org_name', e.target.value)} className="w-full max-w-lg border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
          </div>
        </div>

        {/* Logo */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Logo" subtitle="Squared image is preferred by the search engines." />
          <div className="w-2/3 pl-8">
            <button onClick={() => openMediaModal('seo_local_logo')} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-[13px] font-medium hover:bg-gray-50 mb-3 shadow-sm transition-colors">
              Add or Upload File
            </button>
            {settings.seo_local_logo && (
              <div className="mt-2 border border-gray-200 p-2 inline-block rounded bg-white shadow-sm relative group">
                <img src={settings.seo_local_logo} alt="Logo" className="max-w-[200px] max-h-[150px] object-contain" />
                <button onClick={() => handleChange('seo_local_logo', '')} className="absolute -top-3 -right-3 bg-white text-gray-500 rounded-full border border-gray-200 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 shadow-sm"><X className="w-4 h-4"/></button>
              </div>
            )}
          </div>
        </div>

        {/* URL */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="URL" subtitle="URL of the item." />
          <div className="w-2/3 pl-8">
            <input type="text" value={settings.seo_local_url || ''} onChange={(e) => handleChange('seo_local_url', e.target.value)} placeholder="https://..." className="w-full max-w-lg border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
          </div>
        </div>

        {/* Use Multiple Locations */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Use Multiple Locations" subtitle="Turning on this feature will enable a custom post type for multiple locations where you can enter data for individual locations." />
          <div className="w-2/3 pl-8 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.seo_local_multiple_locations === 'true'} onChange={() => toggleBoolean('seo_local_multiple_locations')} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0085ba]"></div>
            </label>
          </div>
        </div>

        {/* Email */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Email" subtitle="Enter the main email address that should be displayed in the Knowledge Graph." />
          <div className="w-2/3 pl-8">
            <input type="email" value={settings.seo_local_email || ''} onChange={(e) => handleChange('seo_local_email', e.target.value)} className="w-full max-w-lg border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
          </div>
        </div>

        {/* Address */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Address" subtitle="Your company address." />
          <div className="w-2/3 pl-8">
            <div className="max-w-lg space-y-3">
              <div>
                <input type="text" value={address.streetAddress || ''} onChange={(e) => updateAddress('streetAddress', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" placeholder="Street Address" />
              </div>
              <div>
                <input type="text" value={address.addressLocality || ''} onChange={(e) => updateAddress('addressLocality', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" placeholder="Locality" />
              </div>
              <div>
                <input type="text" value={address.addressRegion || ''} onChange={(e) => updateAddress('addressRegion', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" placeholder="Region" />
              </div>
              <div>
                <input type="text" value={address.postalCode || ''} onChange={(e) => updateAddress('postalCode', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" placeholder="Postal Code" />
              </div>
              <div>
                <input type="text" value={address.addressCountry || ''} onChange={(e) => updateAddress('addressCountry', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" placeholder="Country" />
              </div>
            </div>
          </div>
        </div>

        {/* Address Format */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Address Format" subtitle="Format used when displaying the address anywhere on your site." />
          <div className="w-2/3 pl-8">
            <textarea value={settings.seo_local_address_format || '{address} {locality}, {region} {postalcode}'} onChange={(e) => handleChange('seo_local_address_format', e.target.value)} rows={3} className="w-full max-w-lg border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] resize-y" />
            <p className="text-[12px] text-gray-500 mt-2">Available Tags: <code>{'{address}'}</code> <code>{'{locality}'}</code> <code>{'{region}'}</code> <code>{'{postalcode}'}</code> <code>{'{country}'}</code></p>
          </div>
        </div>

        {/* Business Type */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Business Type" subtitle="Select your business type." />
          <div className="w-2/3 pl-8">
            <select value={settings.seo_local_business_type || 'Organization'} onChange={(e) => handleChange('seo_local_business_type', e.target.value)} className="w-full max-w-md border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] bg-white">
              <option value="Organization">Organization</option>
              <option value="LocalBusiness">Local Business</option>
              <option value="Store">Store</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Corporation">Corporation</option>
              <option value="EducationalOrganization">Educational Organization</option>
            </select>
          </div>
        </div>

        {/* Opening Hours Format */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Opening Hours Format" subtitle="Time format to be used in the front-end display." />
          <div className="w-2/3 pl-8 pt-2">
            <div className="flex items-center gap-4 bg-gray-100 p-1 w-max rounded border border-gray-200 shadow-inner">
              <button 
                onClick={() => handleChange('seo_local_opening_hours_format', '24')}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${settings.seo_local_opening_hours_format !== '12' ? 'bg-[#0085ba] text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              >
                24H
              </button>
              <button 
                onClick={() => handleChange('seo_local_opening_hours_format', '12')}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${settings.seo_local_opening_hours_format === '12' ? 'bg-[#0085ba] text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              >
                12H
              </button>
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Opening Hours" subtitle="Add multiple sets if you have different working hours during the day. Use '00:00-00:00' format for 24-hours." />
          <div className="w-2/3 pl-8">
            <div className="space-y-3 mb-4 max-w-lg">
              {openingHours.map((hour: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 relative group">
                  <div className="w-1/3">
                    <select value={hour.day} onChange={(e) => updateOpeningHour(idx, 'day', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-2 text-[14px] outline-none bg-white focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={hour.timeStart} onChange={(e) => updateOpeningHour(idx, 'timeStart', e.target.value)} className="border border-gray-300 rounded px-2 py-2 text-[14px] outline-none flex-1 focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
                    <span className="text-gray-500 text-sm">-</span>
                    <input type="time" value={hour.timeEnd} onChange={(e) => updateOpeningHour(idx, 'timeEnd', e.target.value)} className="border border-gray-300 rounded px-2 py-2 text-[14px] outline-none flex-1 focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
                  </div>
                  <button onClick={() => removeOpeningHour(idx)} className="text-red-500 hover:text-white hover:bg-red-500 rounded p-1 transition-colors" title="Remove">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addOpeningHour} className="px-4 py-2 border border-gray-300 rounded text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Add Time
            </button>
          </div>
        </div>

        {/* Phone Number */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Phone Number" subtitle="Add multiple phone numbers along with their respective types." />
          <div className="w-2/3 pl-8">
            <div className="space-y-3 mb-4 max-w-lg">
              {phones.map((phone: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 relative group">
                  <div className="w-1/3">
                    <select value={phone.type} onChange={(e) => updatePhone(idx, 'type', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-2 text-[14px] outline-none bg-white focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]">
                      <option value="Customer Service">Customer Service</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="Billing Support">Billing Support</option>
                      <option value="Bill Payment">Bill Payment</option>
                      <option value="Sales">Sales</option>
                      <option value="Reservations">Reservations</option>
                      <option value="Credit Card Support">Credit Card Support</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Baggage Tracking">Baggage Tracking</option>
                      <option value="Roadside Assistance">Roadside Assistance</option>
                      <option value="Package Tracking">Package Tracking</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <input type="text" value={phone.number} onChange={(e) => updatePhone(idx, 'number', e.target.value)} placeholder="+1-800-555-1234" className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
                  </div>
                  <button onClick={() => removePhone(idx)} className="text-red-500 hover:text-white hover:bg-red-500 rounded p-1 transition-colors" title="Remove">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addPhone} className="px-4 py-2 border border-gray-300 rounded text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Add Number
            </button>
          </div>
        </div>

        {/* Price Range */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Price Range" subtitle="Price range of the business (usually $ to $$$$)." />
          <div className="w-2/3 pl-8">
            <input type="text" value={settings.seo_local_price_range || ''} onChange={(e) => handleChange('seo_local_price_range', e.target.value)} placeholder="$$$" className="w-24 border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] text-center" />
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Additional Info" subtitle="Add custom details. For example, specify 'Founder' as the key and 'John Doe' as the value." />
          <div className="w-2/3 pl-8">
            <div className="space-y-3 mb-4 max-w-lg">
              {additionalInfo.map((info: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 relative group">
                  <div className="w-1/3">
                    <input type="text" value={info.key} onChange={(e) => updateAdditionalInfo(idx, 'key', e.target.value)} placeholder="Key (e.g. Legal Name)" className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
                  </div>
                  <div className="flex-1">
                    <input type="text" value={info.value} onChange={(e) => updateAdditionalInfo(idx, 'value', e.target.value)} placeholder="Value" className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
                  </div>
                  <button onClick={() => removeAdditionalInfo(idx)} className="text-red-500 hover:text-white hover:bg-red-500 rounded p-1 transition-colors" title="Remove">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addAdditionalInfo} className="px-4 py-2 border border-gray-300 rounded text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Add Info
            </button>
          </div>
        </div>

        {/* Google Maps API Key */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Google Maps API Key" subtitle="Required to display maps on the front-end." />
          <div className="w-2/3 pl-8">
            <input type="password" value={settings.seo_local_google_maps_key || ''} onChange={(e) => handleChange('seo_local_google_maps_key', e.target.value)} placeholder="••••••••••••••••••••••••" className="w-full max-w-lg border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
          </div>
        </div>

        {/* Geo Coordinates */}
        <div className="flex border-b border-gray-100 p-6">
          <LabelCol title="Geo Coordinates" subtitle="Latitude and longitude values separated by comma." />
          <div className="w-2/3 pl-8">
            <input type="text" value={settings.seo_local_geo_coords || ''} onChange={(e) => handleChange('seo_local_geo_coords', e.target.value)} placeholder="19.1919691, 72.8434154" className="w-full max-w-lg border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
          </div>
        </div>

        {/* About & Contact Pages */}
        <div className="flex p-6">
          <LabelCol title="About Page & Contact Page" subtitle="Select your About and Contact pages from your CMS." />
          <div className="w-2/3 pl-8 max-w-lg space-y-6">
            <div>
              <label className="block text-[14px] font-bold text-gray-800 mb-2">About Page</label>
              <select 
                value={settings.seo_local_about_page || ''} 
                onChange={(e) => handleChange('seo_local_about_page', e.target.value)} 
                className="w-full border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] bg-white"
              >
                <option value="">Select a page...</option>
                {pages.map(p => (
                  <option key={p.id} value={p.slug}>{p.title}</option>
                ))}
              </select>
              {settings.seo_local_about_page && (
                <p className="text-[13px] text-gray-600 mt-2">
                  Selected Page: <a href={`/${settings.seo_local_about_page}`} target="_blank" className="text-[#0085ba] hover:underline">{siteUrl}/{settings.seo_local_about_page}</a>
                </p>
              )}
            </div>
            
            <hr className="border-gray-100" />
            
            <div>
              <label className="block text-[14px] font-bold text-gray-800 mb-2">Contact Page</label>
              <select 
                value={settings.seo_local_contact_page || ''} 
                onChange={(e) => handleChange('seo_local_contact_page', e.target.value)} 
                className="w-full border border-gray-300 rounded px-3 py-2.5 text-[14px] outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] bg-white"
              >
                <option value="">Select a page...</option>
                {pages.map(p => (
                  <option key={p.id} value={p.slug}>{p.title}</option>
                ))}
              </select>
              {settings.seo_local_contact_page && (
                <p className="text-[13px] text-gray-600 mt-2">
                  Selected Page: <a href={`/${settings.seo_local_contact_page}`} target="_blank" className="text-[#0085ba] hover:underline">{siteUrl}/{settings.seo_local_contact_page}</a>
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}
