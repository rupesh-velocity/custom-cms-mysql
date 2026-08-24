'use client';

import { useState, useEffect } from 'react';
import { BASE_PATH } from '@/lib/config';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export default function FrontendForm({ id }: { id: string }) {
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    fetch(`${BASE_PATH}/api/forms/${id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          if (data.status !== 'Published') {
            setError('This form is currently unavailable.');
            setLoading(false);
            return;
          }
          setForm(data);
          const fields = data.fields ? JSON.parse(data.fields) : [];
          const initialData: any = {};
          fields.forEach((f: any) => {
            if (f.type === 'checkbox') {
              initialData[f.id] = f.defaultValue ? f.defaultValue.split(',').map((s: string) => s.trim()) : [];
            } else {
              initialData[f.id] = f.defaultValue || '';
            }
          });
          setFormData(initialData);
        }
        setLoading(false);
      });
  }, [id]);

  const settings = form?.settings ? JSON.parse(form.settings) : {
    submitText: 'Submit Form',
    successAction: 'message',
    successMessage: 'Your submission has been received successfully.',
    redirectUrl: '',
    enableHoneypot: form?.settings?.includes('enableSpamProtection') || form?.settings?.includes('"spamProtectionType":"honeypot"') ? true : false,
    enableRecaptchaV3: false,
    recaptchaSiteKey: ''
  };

  useEffect(() => {
    if (settings.enableRecaptchaV3 && settings.recaptchaSiteKey) {
      if (!document.getElementById('recaptcha-script')) {
        const script = document.createElement('script');
        script.id = 'recaptcha-script';
        script.src = `https://www.google.com/recaptcha/api.js?render=${settings.recaptchaSiteKey}`;
        document.head.appendChild(script);
      }
    }
  }, [settings.enableRecaptchaV3, settings.recaptchaSiteKey]);

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-lg max-w-2xl mx-auto my-8"></div>;
  if (!form && !error) return null;

  if (error && !form) {
    return (
      <div className="w-full text-center">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  const fields = form.fields ? JSON.parse(form.fields) : [];

  const visibleFields = fields.filter((field: any) => {
    if (!field.conditionalLogic?.enabled) return true;
    const targetValue = formData[field.conditionalLogic.fieldId];
    const expectedValue = field.conditionalLogic.equals;
    
    if (Array.isArray(targetValue)) {
      return targetValue.includes(expectedValue);
    }
    return targetValue === expectedValue;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Honeypot check
    if (settings.enableHoneypot && honeypot) {
      setSuccess(true);
      return;
    }

    setSubmitting(true);
    setError('');

    if (settings.enableRecaptchaV3 && settings.recaptchaSiteKey) {
      if (window.grecaptcha) {
        window.grecaptcha.ready(function() {
          window.grecaptcha.execute(settings.recaptchaSiteKey, {action: 'submit'}).then(function(token: string) {
            submitData(token);
          });
        });
      } else {
        setError("reCAPTCHA couldn't be loaded. Please check your connection.");
        setSubmitting(false);
      }
    } else {
      submitData();
    }
  };

  const submitData = async (recaptchaToken?: string) => {
    try {
      const res = await fetch(`${BASE_PATH}/api/forms/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: id, data: formData, recaptchaToken, pageUrl: window.location.href })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (settings.successAction === 'redirect' && settings.redirectUrl) {
          window.location.href = settings.redirectUrl;
        } else {
          setSuccess(true);
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="w-full text-center my-8">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Success!</h3>
        <p className="text-gray-500 text-lg leading-relaxed whitespace-pre-wrap max-w-md mx-auto">
          {settings.successMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {!settings.hideTitle && (
        <h3 className="text-2xl font-bold text-gray-900 mb-6">{form.title}</h3>
      )}
      
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100">{error}</div>}
      
      <form onSubmit={handleSubmit} className="flex flex-wrap -mx-3 relative">
        {settings.enableHoneypot && (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
            <input type="text" name="b_name" tabIndex={-1} value={honeypot} onChange={e => setHoneypot(e.target.value)} />
          </div>
        )}

        {visibleFields.map((field: any) => {
          let widthClass = "w-full";
          if (field.width === '50') widthClass = "w-full sm:w-1/2";
          else if (field.width === '33') widthClass = "w-full sm:w-1/3";
          else if (field.width === '25') widthClass = "w-full sm:w-1/4";
          
          return (
          <div key={field.id} className={`${widthClass} px-3 mb-6`}>
            {field.type !== 'html' && field.type !== 'consent' && (
              <>
                {!field.hideLabel && (
                  <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                )}
                {field.description && <p className="text-xs text-gray-500 mb-3 text-left">{field.description}</p>}
              </>
            )}
            
            {field.type === 'html' ? (
              <div dangerouslySetInnerHTML={{ __html: field.options || '' }} className="prose prose-sm max-w-none text-left" />
            ) : field.type === 'consent' ? (
              <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-700 text-left pt-2">
                <input 
                  type="checkbox" 
                  required={field.required}
                  checked={formData[field.id] === 'yes'}
                  onChange={e => setFormData({...formData, [field.id]: e.target.checked ? 'yes' : ''})}
                  onInvalid={e => e.currentTarget.setCustomValidity(field.placeholder || 'You must agree to continue.')}
                  onInput={e => e.currentTarget.setCustomValidity('')}
                  className="rounded text-[#5e3fde] focus:ring-[#5e3fde] mt-1 shrink-0"
                />
                <span dangerouslySetInnerHTML={{ __html: field.options || field.label || '' }} />
              </label>
            ) : field.type === 'textarea' ? (
              <textarea 
                required={field.required}
                value={formData[field.id] || ''}
                onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                placeholder={field.placeholder || ''}
                className={`w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] transition-all outline-none resize-y ${field.customClass || ''}`}
                rows={4}
              />
            ) : field.type === 'select' ? (
              <select 
                required={field.required}
                value={formData[field.id] || ''}
                onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                className={`w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] transition-all outline-none appearance-none ${field.customClass || ''}`}
              >
                <option value="">Select an option</option>
                {field.options?.split(',').map((opt: string, i: number) => (
                  <option key={i} value={opt.trim()}>{opt.trim()}</option>
                ))}
              </select>
            ) : field.type === 'radio' ? (
              <div className="space-y-2">
                {field.options?.split(',').map((opt: string, i: number) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input 
                      type="radio" 
                      name={field.id}
                      required={field.required && !formData[field.id]}
                      value={opt.trim()}
                      checked={formData[field.id] === opt.trim()}
                      onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                      className={`text-[#5e3fde] focus:ring-[#5e3fde] ${field.customClass || ''}`}
                    />
                    {opt.trim()}
                  </label>
                ))}
              </div>
            ) : field.type === 'checkbox' ? (
              <div className="space-y-2">
                {field.options?.split(',').map((opt: string, i: number) => {
                  const currentValues = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                  return (
                    <label key={i} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input 
                        type="checkbox" 
                        value={opt.trim()}
                        checked={currentValues.includes(opt.trim())}
                        onChange={e => {
                          if (e.target.checked) {
                            setFormData({...formData, [field.id]: [...currentValues, opt.trim()]});
                          } else {
                            setFormData({...formData, [field.id]: currentValues.filter((v: string) => v !== opt.trim())});
                          }
                        }}
                        className={`rounded text-[#5e3fde] focus:ring-[#5e3fde] ${field.customClass || ''}`}
                      />
                      {opt.trim()}
                    </label>
                  );
                })}
              </div>
            ) : field.type === 'file' ? (
              <div>
                <input 
                  type="file" 
                  required={field.required && !formData[field.id]}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const uploadData = new FormData();
                    uploadData.append('file', file);
                    try {
                      const res = await fetch(`${BASE_PATH}/api/upload`, { method: 'POST', body: uploadData });
                      const data = await res.json();
                      if (data.url) {
                         setFormData({...formData, [field.id]: data.url});
                      }
                    } catch (err) {
                      console.error("Upload failed", err);
                      alert("File upload failed. Please try again.");
                    }
                  }}
                  className={`w-full px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] transition-all outline-none ${field.customClass || ''}`}
                />
                {formData[field.id] && (
                  <p className="text-xs text-[#166534] mt-2 font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    File uploaded successfully
                  </p>
                )}
              </div>
            ) : (
              <input  
                type={field.type} // Supports 'text', 'email', 'number', 'tel', 'date' automatically
                required={field.required}
                value={formData[field.id] || ''}
                onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                placeholder={field.placeholder || ''}
                className={`w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] transition-all outline-none ${field.customClass || ''}`}
              />
            )}
          </div>
        )})}

        {settings.enableRecaptchaV3 && (
          <p className="text-[11px] text-gray-500 leading-tight">
            This site is protected by reCAPTCHA and the Google <a href="https://policies.google.com/privacy" className="text-[#5e3fde] hover:underline" target="_blank" rel="noreferrer">Privacy Policy</a> and <a href="https://policies.google.com/terms" className="text-[#5e3fde] hover:underline" target="_blank" rel="noreferrer">Terms of Service</a> apply.
          </p>
        )}

        <div className="w-full px-3 pt-2">
          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-[#5e3fde] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#4b32b2] hover:shadow-md transition-all mt-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[15px]"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : settings.submitText}
          </button>
        </div>
      </form>
    </div>
  );
}
