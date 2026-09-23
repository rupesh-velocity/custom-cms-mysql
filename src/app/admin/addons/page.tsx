import { prisma } from '@/lib/prisma';
import AddonsManager from '@/components/AddonsManager';

export const dynamic='force-dynamic';

const cards=[
  {slug:'google-reviews',key:'addon_google_reviews_enabled',title:'Google Reviews',description:'Fetch and display Google Business Profile ratings and reviews with local caching.'},
  {slug:'maintenance',key:'addon_maintenance_enabled',title:'Maintenance Mode',description:'Temporarily show visitors a maintenance screen while administrators keep access.'},
  {slug:'analytics',key:'addon_analytics_enabled',title:'Analytics / Tracking',description:'Configure GA4, GTM and dedicated head/body tracking snippets separately from site custom JavaScript.'},
  {slug:'cookie-consent',key:'addon_cookie_consent_enabled',title:'Cookie Consent',description:'Display an accept/reject banner and gate built-in analytics until consent is granted.'},
  {slug:'image-optimization',key:'addon_image_optimization_enabled',title:'Image Optimization',description:'Optimize existing and new uploads, convert to WebP, and retain originals for restore.'},
  {slug:'popup-builder',key:'addon_popup_builder_enabled',title:'Popup Builder',description:'Create HTML popups with delay, scroll, exit intent, scheduling and page targeting.'},
  {slug:'twilio',key:'addon_twilio_enabled',title:'Twilio OTP Login',description:'Use registered mobile numbers and Twilio Verify codes for password-free CMS login.'},
  {slug:'import-export',key:'addon_import_export_enabled',title:'CMS Import / Export',description:'Move Pages, Posts, Media, Forms and related CMS data between installations.'},
  {slug:'smtp',key:'addon_smtp_enabled',title:'SMTP',description:'Send mail through Gmail, hosting SMTP, Outlook, Zoho, SMTP relays or custom servers.'},
  {slug:'search-replace',key:'addon_search_replace_enabled',title:'Search & Replace',description:'Find text or URLs across CMS content and safely replace them in bulk with a Dry Run option.'},
  {slug:'physical-products',key:'enable_physical_products',title:'Physical Products',description:'Enable the product catalog, orders and physical-product commerce tools in the CMS.',configureHref:'/admin/settings/ecommerce'},
];

export default async function AddonsPage(){
  const rows=await prisma.setting.findMany({where:{key:{in:cards.map(c=>c.key)}}});
  const initial=rows.reduce((a:Record<string,string>,r:any)=>{a[r.key]=r.value||'';return a;},{});
  return <div className="max-w-[1200px]">
    <div className="mb-7"><h1 className="text-2xl font-bold text-gray-900">Add-ons</h1><p className="text-gray-500 mt-2">Enable only the CMS modules you need. Configuration stays available without crowding the main sidebar.</p></div>
    <AddonsManager cards={cards} initial={initial}/>
  </div>;
}
