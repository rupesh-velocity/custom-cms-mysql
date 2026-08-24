'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Cog, Briefcase, FileText, Share2, ChevronDown, ChevronUp, 
  XCircle, CheckCircle2, HelpCircle, TrendingUp, X, Star,
  Book, GraduationCap, Database, Calendar, List, CheckSquare, 
  Film, Music, User, Mic, ShoppingCart, Utensils, UtensilsCrossed, 
  Settings, LayoutGrid, Video, PlusCircle, Info, Search, Eye, Trash2, Edit2, Copy, Link as LinkIcon
} from 'lucide-react';
import { resolveSeoVariables, getResolvedLength } from '@/lib/seo-variables';
import { BASE_PATH } from '@/lib/config';

export interface SchemaNode {
  id: string;
  key: string;
  value: string;
  type: 'property' | 'group';
  children: SchemaNode[];
}

interface SeoAnalyzerProps {
  title: string;
  setTitle: (t: string) => void;
  slug: string;
  setSlug: (s: string) => void;
  metaDescription: string;
  setMetaDescription: (d: string) => void;
  content: string;
  focusKeyword: string;
  setFocusKeyword: (k: string) => void;
  seoTitle?: string;
  setSeoTitle?: (t: string) => void;
  redirectUrl?: string;
  setRedirectUrl?: (url: string) => void;
  redirectType?: string;
  setRedirectType?: (type: string) => void;
  noIndex?: boolean;
  setNoIndex?: (val: boolean) => void;
  schemaJson?: string;
  setSchemaJson?: (val: string) => void;
  onScoreChange?: (score: number) => void;
  seoRobots?: string | null;
  setSeoRobots?: (val: string | null) => void;
  seoAdvancedRobots?: string | null;
  setSeoAdvancedRobots?: (val: string | null) => void;
  globalSettings?: any;
  isPost?: boolean;
  featuredImage?: string | null;
  customFieldsText?: string;
}

const resolveVariables = (str: string, props: Partial<SeoAnalyzerProps>) => {
  if (typeof str !== 'string') return str;
  
  const siteName = props.globalSettings?.site_title || 'Custom CMS';
  const siteUrl = props.globalSettings?.site_url || 'http://localhost:3000';
  const siteIcon = props.globalSettings?.site_icon || `${siteUrl}/logo.png`;
  const defaultThumbnail = props.featuredImage || props.globalSettings?.seo_og_thumbnail || `${siteUrl}/thumbnail.png`;

  return str
    .replace(/%seo_title%/g, props.seoTitle || props.title || '')
    .replace(/%seo_description%/g, props.metaDescription || '')
    .replace(/%url%/g, props.redirectUrl || '')
    .replace(/%name%/g, siteName)
    .replace(/%org_name%/g, siteName)
    .replace(/%org_url%/g, siteUrl)
    .replace(/%org_logo%/g, siteIcon)
    .replace(/%post_thumbnail%/g, defaultThumbnail)
    .replace(/%date\(Y-m-d\)%/g, new Date().toISOString().split('T')[0])
    .replace(/%keywords%/g, props.focusKeyword || '');
};

const resolveObjectVariables = (obj: any, props: Partial<SeoAnalyzerProps>): any => {
  if (typeof obj === 'string') return resolveVariables(obj, props);
  if (Array.isArray(obj)) return obj.map(item => resolveObjectVariables(item, props));
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = resolveObjectVariables(obj[key], props);
    }
    return newObj;
  }
  return obj;
};

const removeEmptyFields = (obj: any): any => {
  if (Array.isArray(obj)) {
    const arr = obj.map(removeEmptyFields).filter((v: any) => v !== null && v !== undefined && v !== '');
    return arr.length > 0 ? arr : undefined;
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      const val = removeEmptyFields(obj[key]);
      if (val !== null && val !== undefined && val !== '') {
        newObj[key] = val;
      }
    }
    return Object.keys(newObj).length > 0 ? newObj : undefined;
  }
  return obj;
};

type FieldType = 'text' | 'textarea' | 'radio' | 'group' | 'info' | 'section' | 'shortcode';

interface SchemaField {
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  info?: string;
  subFields?: SchemaField[];
  itemLabel?: string;
}

const shortcodeInfo = "You can either use this shortcode or Schema Block in the block editor to print the schema data in the content in order to meet the Google's guidelines. Read more about it here.";
const reviewLocationInfo = "Custom (use shortcode)\nThe review or rating must be displayed on the page to comply with Google's Schema guidelines.\n\nShortcode\n[rank_math_rich_snippet]\n" + shortcodeInfo;
const shortcodeOnlyInfo = shortcodeInfo;

const reviewFields: SchemaField[] = [
  { label: 'Review', type: 'section' },
  { label: 'RATING SCORE', type: 'text' },
  { label: 'RATING MINIMUM', type: 'text', placeholder: '1', info: 'Rating minimum score' },
  { label: 'RATING MAXIMUM', type: 'text', placeholder: '5', info: 'Rating maximum score' }
];

const addressFields: SchemaField[] = [
  { label: 'Address', type: 'section' },
  { label: 'STREET ADDRESS', type: 'text' },
  { label: 'LOCALITY', type: 'text' },
  { label: 'REGION', type: 'text' },
  { label: 'POSTAL CODE', type: 'text' },
  { label: 'COUNTRY', type: 'text' }
];

const schemaTypeMap: Record<string, string> = {
  'FAQ': 'FAQPage',
  'Job Posting': 'JobPosting',
  'Fact Check': 'ClaimReview',
  'Podcast Episode': 'PodcastEpisode',
};

const mapSchemaType = (t: any): string => {
  if (Array.isArray(t)) {
    if (t.includes('FAQPage')) return 'FAQ';
    if (t.includes('FAQ')) return 'FAQ';
    for (const item of t) {
      const found = Object.entries(schemaTypeMap).find(([k, v]) => v === item);
      if (found) return found[0];
      if (schemaFieldDefinitions[item]) return item;
    }
    return t[0] || '';
  }
  const found = Object.entries(schemaTypeMap).find(([k, v]) => v === t);
  return found ? found[0] : (t || '');
};

const SEO_VARIABLES = [
  { label: 'Title', tag: 'title', desc: 'Title of the current post or page' },
  { label: 'Site Name', tag: 'sitename', desc: 'Your global website name' },
  { label: 'Separator', tag: 'sep', desc: 'The separator symbol' },
  { label: 'Site Description', tag: 'sitedesc', desc: 'Your global website tagline/description' },
  { label: 'Excerpt', tag: 'excerpt', desc: 'The summary or description of the current post' },
  { label: 'Current Date', tag: 'currentdate', desc: 'The current server date' },
  { label: 'Current Day', tag: 'currentday', desc: 'The current server day of the week' },
  { label: 'Current Month', tag: 'currentmonth', desc: 'The current server month' },
  { label: 'Current Year', tag: 'currentyear', desc: 'The current server year' },
  { label: 'Author Name', tag: 'name', desc: 'The display name of the author' },
  { label: 'Author ID', tag: 'userid', desc: 'The database ID of the author' },
  { label: 'Category', tag: 'category', desc: 'The primary category' },
  { label: 'Post ID', tag: 'id', desc: 'The unique database ID of the post' },
  { label: 'Post Date', tag: 'date', desc: 'The date the post was published' },
  { label: 'Modified Date', tag: 'modified', desc: 'The date the post was last updated' },
];

const schemaFieldDefinitions: Record<string, SchemaField[]> = {
  'Article': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'KEYWORDS *', type: 'text', placeholder: '%keywords%' },
    { label: 'ARTICLE TYPE *', type: 'radio', options: ['Article', 'Blog Post', 'News Article'] }
  ],
  'Book': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'REVIEW LOCATION', type: 'info', info: reviewLocationInfo },
    { label: 'URL *', type: 'text' },
    { label: 'AUTHOR NAME *', type: 'text', placeholder: '%name%' },
    { label: 'REVIEW', type: 'text' },
    ...reviewFields,
    { label: 'EDITIONS', type: 'group' }
  ],
  'Course': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'REVIEW LOCATION', type: 'info', info: reviewLocationInfo },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'Course Provider', type: 'section' },
    { label: 'PROVIDER TYPE', type: 'radio', options: ['Organization', 'Person'] },
    { label: 'COURSE PROVIDER NAME', type: 'text' },
    { label: 'COURSE PROVIDER URL', type: 'text' },
    { label: 'Course Instance', type: 'section' },
    { label: 'COURSE MODE', type: 'radio', options: ['Online'], info: 'The medium through which the course will be delivered.' },
    { label: 'COURSE WORKLOAD', type: 'text', info: 'Total time to watch all videos and complete all assignments and exams for the course. Use the 8601 format. Example: PT22H' },
    { label: 'Course Schedule', type: 'section' },
    { label: 'DURATION', type: 'text', info: 'Suggested pacing in repeatFrequency units (8601 duration format).' },
    { label: 'REPEAT COUNT', type: 'text' },
    { label: 'REPEAT FREQUENCY', type: 'text', placeholder: 'Select Repeat Frequency' },
    { label: 'START DATE', type: 'text', placeholder: 'YYYY-MM-DD' },
    { label: 'END DATE', type: 'text', placeholder: 'YYYY-MM-DD' },
    { label: 'Offers', type: 'section' },
    { label: 'CATEGORY', type: 'text', info: 'The pricing category of the course. Example: Free, Partially Free, Subscription, Paid' },
    { label: 'PRICE', type: 'text' },
    { label: 'CURRENCY', type: 'text' },
    ...reviewFields
  ],
  'Dataset': [
    { label: 'DATASET NAME *', type: 'text' },
    { label: 'DESCRIPTION', type: 'textarea' }
  ],
  'Event': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'REVIEW LOCATION', type: 'info', info: reviewLocationInfo },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'EVENT TYPE', type: 'text', info: 'Type of the event' },
    { label: 'EVENT STATUS', type: 'radio', options: ['Scheduled'], info: 'Current status of the event (optional)' },
    { label: 'EVENT ATTENDANCE MODE', type: 'radio', options: ['Offline'], info: 'Indicates whether the event occurs online, offline at a physical location, or a mix of both.' },
    { label: 'VENUE NAME', type: 'text' },
    { label: 'VENUE URL', type: 'text' },
    ...addressFields,
    { label: 'Performer Information', type: 'section' },
    { label: 'PERFORMER TYPE', type: 'radio', options: ['Organization', 'Person'] },
    { label: 'PERFORMER NAME', type: 'text' },
    { label: 'WEBSITE OR SOCIAL LINK', type: 'text' },
    { label: 'START DATE *', type: 'text', info: 'Date and time of the event' },
    { label: 'END DATE', type: 'text', info: 'End date and time of the event' },
    { label: 'Offers', type: 'section' },
    { label: 'OFFER URL', type: 'text' },
    { label: 'PRICE', type: 'text' },
    { label: 'CURRENCY', type: 'text' },
    { label: 'AVAILABILITY', type: 'radio', options: ['In Stock'], info: 'Offer availability' },
    { label: 'PRICE VALID FROM', type: 'text' },
    { label: 'INVENTORY LEVEL', type: 'text' },
    ...reviewFields
  ],
  'FAQ': [
    { label: 'NAME *', type: 'text', placeholder: '%seo_title%' },
    { label: 'SHORTCODE', type: 'shortcode', info: 'You can use the Schema Block in the block editor, or copy and paste this in the content. This shortcode will work on this page only.' },
    { 
      label: 'Questions', 
      type: 'group',
      itemLabel: 'Question',
      subFields: [
        { label: 'QUESTION', type: 'text' },
        { label: 'URL', type: 'text' },
        { label: 'IMAGE', type: 'text' },
        { label: 'Answer', type: 'textarea' }
      ]
    }
  ],
  'Fact Check': [
    { label: 'CLAIM *', type: 'textarea' },
    { label: 'CLAIM AUTHOR', type: 'text' },
    { label: 'FACT CHECK RESULT', type: 'text' }
  ],
  'HowTo': [
    { label: 'NAME *', type: 'text' },
    { label: 'DESCRIPTION', type: 'textarea' },
    { label: 'STEPS', type: 'group' }
  ],
  'Job Posting': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'SHORTCODE', type: 'shortcode', info: shortcodeOnlyInfo },
    { label: 'SALARY CURRENCY', type: 'text', info: 'ISO 4217 Currency code. Example: EUR' },
    { label: 'SALARY (RECOMMENDED)', type: 'text', info: 'Insert amount, e.g. 50.00, or a salary range, e.g. 40.00-50.00' },
    { label: 'PAYROLL (RECOMMENDED)', type: 'radio', options: ['None'] },
    { label: 'DATE POSTED', type: 'text', placeholder: '%date(Y-m-d)%' },
    { label: 'EXPIRY POSTED', type: 'text' },
    { label: 'UNPUBLISH WHEN EXPIRED', type: 'radio', options: ['Yes'] },
    { label: 'EMPLOYMENT TYPE (RECOMMENDED)', type: 'radio', options: ['None', 'Full Time', 'Part Time', 'Contractor', 'Temporary', 'Intern', 'Volunteer', 'Per Diem', 'Other'] },
    { label: 'HIRING ORGANIZATION', type: 'text', placeholder: '%org_name%' },
    { label: 'ORGANIZATION URL (RECOMMENDED)', type: 'text', placeholder: '%org_url%' },
    { label: 'ORGANIZATION LOGO (RECOMMENDED)', type: 'text', placeholder: '%org_logo%' },
    { label: 'POSTING ID (RECOMMENDED)', type: 'text' },
    ...addressFields
  ],
  'Movie': [
    { label: 'MOVIE NAME *', type: 'text' },
    { label: 'DIRECTOR', type: 'text' },
    { label: 'DATE CREATED', type: 'text' }
  ],
  'Music': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'SHORTCODE', type: 'shortcode', info: shortcodeOnlyInfo },
    { label: 'URL', type: 'text', placeholder: '%url%' },
    { label: 'MUSIC TYPE', type: 'radio', options: ['MusicGroup', 'MusicAlbum'] }
  ],
  'Person': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'SHORTCODE', type: 'shortcode', info: shortcodeOnlyInfo },
    { label: 'EMAIL', type: 'text' },
    ...addressFields,
    { label: 'GENDER', type: 'text' },
    { label: 'JOB TITLE', type: 'text' }
  ],
  'Podcast Episode': [
    { label: 'EPISODE NAME *', type: 'text' },
    { label: 'PODCAST NAME', type: 'text' },
    { label: 'URL', type: 'text' }
  ],
  'Product': [
    { label: 'PRODUCT NAME *', type: 'text', placeholder: '%seo_title%' },
    { label: 'REVIEW LOCATION', type: 'info', info: reviewLocationInfo },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'PRODUCT SKU', type: 'text' },
    { label: 'BRAND NAME', type: 'text' },
    { label: 'Offers', type: 'section' },
    { label: 'PRICE', type: 'text' },
    { label: 'CURRENCY', type: 'text' },
    { label: 'AVAILABILITY', type: 'radio', options: ['In Stock'] },
    { label: 'PRICE VALID UNTIL', type: 'text' },
    ...reviewFields
  ],
  'Recipe': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'REVIEW LOCATION', type: 'info', info: reviewLocationInfo },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'PREPARATION TIME', type: 'text', info: 'ISO 8601 duration format. Example: PT1H30M' },
    { label: 'COOKING TIME', type: 'text' },
    { label: 'TOTAL TIME', type: 'text' },
    { label: 'TYPE', type: 'text' },
    { label: 'CUISINE', type: 'text' },
    { label: 'KEYWORDS', type: 'text' },
    { label: 'RECIPE YIELD', type: 'text' },
    { label: 'CALORIES', type: 'text' },
    { label: 'RECIPE INGREDIENTS', type: 'group' },
    ...reviewFields,
    { label: 'Video', type: 'section' },
    { label: 'NAME', type: 'text' },
    { label: 'VIDEO DESCRIPTION', type: 'textarea' },
    { label: 'VIDEO URL', type: 'text' },
    { label: 'CONTENT URL', type: 'text' },
    { label: 'RECIPE VIDEO THUMBNAIL', type: 'text' },
    { label: 'DURATION', type: 'text' },
    { label: 'VIDEO UPLOAD DATE', type: 'text' },
    { label: 'INSTRUCTION TYPE', type: 'radio', options: ['Single Field', 'How To Step'] },
    { label: 'RECIPE INSTRUCTIONS', type: 'textarea' }
  ],
  'Restaurant': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'SHORTCODE', type: 'shortcode', info: shortcodeOnlyInfo },
    { label: 'PHONE NUMBER', type: 'text' },
    { label: 'PRICE RANGE', type: 'text' },
    ...addressFields,
    { label: 'Geo Coordinates', type: 'section' },
    { label: 'LATITUDE', type: 'text' },
    { label: 'LONGITUDE', type: 'text' },
    { label: 'Timings', type: 'section' },
    { label: 'OPEN DAYS', type: 'radio', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { label: 'OPENING TIME', type: 'text', placeholder: '09:00 AM' },
    { label: 'CLOSING TIME', type: 'text', placeholder: '05:00 PM' },
    { label: 'SERVES CUISINE', type: 'group' },
    { label: 'MENU URL', type: 'text' }
  ],
  'Service': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'SHORTCODE', type: 'shortcode', info: shortcodeOnlyInfo },
    { label: 'SERVICE TYPE', type: 'text', info: "The type of service being offered, e.g. veterans' benefits, emergency relief, etc." },
    { label: 'Offers', type: 'section' },
    { label: 'PRICE', type: 'text' },
    { label: 'CURRENCY', type: 'text' },
    { label: 'Questions', type: 'group', subFields: [
      { label: 'Question', type: 'text' },
      { label: 'URL', type: 'text', placeholder: 'https://' },
      { label: 'Image', type: 'text', placeholder: 'https://' },
      { label: 'Answer', type: 'textarea' }
    ]}
  ],
  'Software': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'REVIEW LOCATION', type: 'info', info: reviewLocationInfo },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'OPERATING SYSTEM', type: 'text', info: 'For example, Windows 7, OSX 10.6, Android 1.6' },
    { label: 'APPLICATION CATEGORY', type: 'text', info: 'For example, Game, Multimedia' },
    { label: 'Offers', type: 'section' },
    { label: 'PRICE', type: 'text' },
    { label: 'CURRENCY', type: 'text' },
    ...reviewFields
  ],
  'Video': [
    { label: 'HEADLINE *', type: 'text', placeholder: '%seo_title%' },
    { label: 'DESCRIPTION', type: 'textarea', placeholder: '%seo_description%' },
    { label: 'SHORTCODE', type: 'info', info: shortcodeOnlyInfo },
    { label: 'EMBED URL', type: 'text' },
{ label: 'CONTENT URL', type: 'text' },
    { label: 'DURATION', type: 'text' }
  ]
};

const CheckItem = ({ check }: { check: any }) => (
  <div className="flex items-start gap-3 py-2 text-[13px]">
    <div className="mt-0.5 shrink-0">
      {check.pass ? <CheckCircle2 className="w-[18px] h-[18px] text-[#22c55e] fill-[#22c55e]/20" /> : <XCircle className="w-[18px] h-[18px] text-[#ef4444] fill-[#ef4444]/20" />}
    </div>
    <div className="flex-1 text-[#333]">{check.pass ? check.passedText : check.text}</div>
    <div className="shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer"><HelpCircle className="w-4 h-4" /></div>
  </div>
);

const Accordion = ({ title, errors, expanded, onToggle, checks }: any) => (
  <div className="border-t border-[#e2e4e7]">
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between p-4 bg-[#f9f9f9] hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-[#1d2327]">{title}</span>
        {errors > 0 ? (
          <span className="bg-[#ffaba8] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">× {errors} Errors</span>
        ) : (
          <span className="bg-[#22c55e] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">✓ Good</span>
        )}
      </div>
      {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
    </button>
    {expanded && <div className="p-4 bg-white space-y-1">{checks.map((c: any, i: number) => <CheckItem key={i} check={c} />)}</div>}
  </div>
);

export default function SeoAnalyzer({
  title, setTitle, slug, setSlug, metaDescription, setMetaDescription, content, focusKeyword, setFocusKeyword,
  seoTitle, setSeoTitle, redirectUrl, setRedirectUrl, redirectType, setRedirectType, noIndex, setNoIndex,
  seoRobots, setSeoRobots,
  seoAdvancedRobots, setSeoAdvancedRobots,
  globalSettings,
  schemaJson = '', setSchemaJson, onScoreChange, isPost = false,
  featuredImage = null,
  customFieldsText = ''
}: SeoAnalyzerProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [isSnippetExpanded, setIsSnippetExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const [expanded, setExpanded] = useState({
    basic: true,
    additional: false,
    title: false,
    content: false,
  });

  const [isTitleVarsOpen, setIsTitleVarsOpen] = useState(false);
  const [isDescVarsOpen, setIsDescVarsOpen] = useState(false);
  const [liveSettings, setLiveSettings] = useState<any>(null);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setLiveSettings(data);
        }
      })
      .catch(() => {});
  }, []);

  // Advanced Tab State
  const [isRedirect, setIsRedirect] = useState(!!redirectUrl);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleIndexToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (setNoIndex) setNoIndex(!isChecked);
  };
  
  const handleNoIndexToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (setNoIndex) setNoIndex(isChecked);
  };

  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isSchemaBuilderOpen, setIsSchemaBuilderOpen] = useState(false);
  const [schemaModalTab, setSchemaModalTab] = useState<string>('templates');
  const [schemaLibraryTab, setSchemaLibraryTab] = useState<'catalog' | 'saved'>('catalog');
  const [selectedSchema, setSelectedSchema] = useState('Article');
  const [editingSchemaIndex, setEditingSchemaIndex] = useState<number | null>(null);
  
  // Custom schema builder state
  const [customSchemaJson, setCustomSchemaJson] = useState('{\n  "@context": "https://schema.org",\n  "@type": "Event"\n}');
  
  // Import schema state
  const [importType, setImportType] = useState('url');
  const [importUrl, setImportUrl] = useState('');
  const [importHtml, setImportHtml] = useState('');
  const [importJson, setImportJson] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [customSchemaNodes, setCustomSchemaNodes] = useState<SchemaNode[]>([
    { id: 'root-1', key: '', value: '', type: 'group', children: [
      { id: 'prop-1', key: '@type', value: '', type: 'property', children: [] }
    ]}
  ]);

  const updateSchemaNode = (nodes: SchemaNode[], id: string, updater: (n: SchemaNode) => SchemaNode): SchemaNode[] => {
    return nodes.map(n => {
      if (n.id === id) return updater({ ...n });
      if (n.children && n.children.length > 0) return { ...n, children: updateSchemaNode(n.children, id, updater) };
      return n;
    });
  };

  const addSchemaNode = (nodes: SchemaNode[], parentId: string, newNode: SchemaNode): SchemaNode[] => {
    if (parentId === 'root') return [...nodes, newNode];
    return nodes.map(n => {
      if (n.id === parentId) return { ...n, children: [...n.children, newNode] };
      if (n.children && n.children.length > 0) return { ...n, children: addSchemaNode(n.children, parentId, newNode) };
      return n;
    });
  };

  const deleteSchemaNode = (nodes: SchemaNode[], id: string): SchemaNode[] => {
    return nodes.filter(n => n.id !== id).map(n => ({
      ...n,
      children: n.children ? deleteSchemaNode(n.children, id) : []
    }));
  };

  const buildJsonFromNodes = (nodes: SchemaNode[]): any => {
    const isArray = nodes.length > 0 && nodes.every(n => !isNaN(Number(n.key)) && String(Number(n.key)) === n.key);
    const result: any = isArray ? [] : {};
    
    nodes.forEach(node => {
      if (!node.key && !isArray) return;
      const key = isArray ? Number(node.key) : node.key;
      let val;
      if (node.type === 'group') {
        val = buildJsonFromNodes(node.children);
      } else {
        val = node.value;
      }
      
      if (key === 'addressCountry' && (val === 'India' || val === 'india')) {
        val = 'IN';
      }
      
      if (isArray) {
        result[key as number] = val;
      } else {
        result[key as string] = val;
      }
    });
    
    if (isArray) {
      return (result as any[]).filter(v => v !== undefined);
    }
    return result;
  };

  const [builderTab, setBuilderTab] = useState<'edit' | 'validation'>('edit');
  const [schemas, setSchemas] = useState<any[]>([]);
  const [schemaData, setSchemaData] = useState<Record<string, string>>({});
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);



  useEffect(() => {
    fetch(`${BASE_PATH}/api/schema-templates`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCustomTemplates(data);
      })
      .catch(() => {});
  }, []);

  const generateSchemaObj = () => {
    let baseObj: any;
    if (selectedSchema === 'Custom') {
      const customObj = buildJsonFromNodes(customSchemaNodes[0]?.children || []);
      baseObj = {
        "@context": "https://schema.org",
        "@graph": [customObj]
      };
    } else {
      const schemaObj: any = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": schemaTypeMap[selectedSchema] || selectedSchema,
          }
        ]
      };
      const graphNode = schemaObj["@graph"][0];
      
      const fields = schemaFieldDefinitions[selectedSchema] || [];
      const fieldValues: Record<string, any> = {};
      
      fields.forEach(field => {
        if (field.type === 'section' || field.type === 'info' || field.type === 'shortcode') return;
        const fieldKey = `${selectedSchema}_${field.label}`;
        let val = schemaData[fieldKey];
        if (!val && field.placeholder) val = field.placeholder;
        
        if (val) {
          const cleanKey = field.label.toLowerCase().replace(/\s*\*\s*$/, '').replace(/ /g, '');
          fieldValues[cleanKey] = val;
        }
      });
      
      if (fieldValues.headline && !fieldValues.name) {
        fieldValues.name = fieldValues.headline;
        delete fieldValues.headline;
      }
      
      if (fieldValues.name) graphNode.name = fieldValues.name;
      if (fieldValues.description) graphNode.description = fieldValues.description;
      
      if (selectedSchema === 'Service' || selectedSchema === 'Product') {
        graphNode.offers = { "@type": "Offer", "availability": "InStock" };
        if (fieldValues.price) graphNode.offers.price = fieldValues.price;
        if (fieldValues.currency) graphNode.offers.currency = fieldValues.currency;
        if (fieldValues.availability) graphNode.offers.availability = fieldValues.availability;
      }
      
      if (selectedSchema === 'Service' || selectedSchema === 'Article' || selectedSchema === 'Blog Posting') {
        graphNode.image = { "@type": "ImageObject", "url": "%post_thumbnail%" };
      }
      
      if (selectedSchema === 'FAQ' && fieldValues.questions) {
        try {
          const qArray = JSON.parse(fieldValues.questions);
          graphNode.mainEntity = qArray.map((q: any) => {
            const qNode: any = { "@type": "Question" };
            if (q.question) qNode.name = q.question;
            if (q.url) qNode.url = q.url;
            if (q.image) qNode.image = q.image;
            if (q.answer) qNode.acceptedAnswer = { "@type": "Answer", "text": q.answer };
            return qNode;
          });
        } catch {}
        delete fieldValues.questions;
      }
      
      if (selectedSchema === 'Service' && fieldValues.questions) {
        try {
          const qArray = JSON.parse(fieldValues.questions);
          if (qArray && qArray.length > 0) {
            graphNode.subjectOf = [
              {
                "@type": "FAQPage",
                "name": fieldValues.headline || "%seo_title%",
                "mainEntity": qArray.map((q: any) => {
                  const qNode: any = { "@type": "Question" };
                  if (q.question) qNode.name = q.question;
                  if (q.url) qNode.url = q.url;
                  if (q.image) qNode.image = q.image;
                  if (q.answer) qNode.acceptedAnswer = { "@type": "Answer", "text": q.answer };
                  return qNode;
                })
              }
            ];
          }
        } catch {}
        delete fieldValues.questions;
      }
      
      const schemaPropertyMap: Record<string, string> = {
        'servicetype': 'serviceType',
        'pricevaliduntil': 'priceValidUntil',
        'operatingsystem': 'operatingSystem',
        'applicationcategory': 'applicationCategory',
        'reviewlocation': 'reviewLocation',
        'eventattendancemode': 'eventAttendanceMode',
        'startdate': 'startDate',
        'enddate': 'endDate',
        'eventstatus': 'eventStatus',
        'performertype': 'performerType',
        'performername': 'performerName',
        'offerurl': 'offerUrl',
        'inventorylevel': 'inventoryLevel',
        'ratingvalue': 'ratingValue',
        'ratingminimum': 'ratingMinimum',
        'ratingmaximum': 'ratingMaximum',
        'bestrating': 'bestRating',
        'worstrating': 'worstRating',
        'reviewcount': 'reviewCount',
        'authorname': 'authorName',
        'dateposted': 'datePosted',
        'expiryposted': 'validThrough',
        'hiringorganization': 'hiringOrganization',
        'organizationurl': 'url',
        'organizationlogo': 'logo',
        'postingid': 'identifier',
        'salarycurrency': 'salaryCurrency',
        'employmenttype': 'employmentType',
        'datecreated': 'dateCreated',
        'musictype': 'musicType',
        'jobtitle': 'jobTitle',
        'productsku': 'sku',
        'brandname': 'brand',
        'preparationtime': 'prepTime',
        'cookingtime': 'cookTime',
        'totaltime': 'totalTime',
        'recipeyield': 'recipeYield',
        'recipeingredients': 'recipeIngredient',
        'recipeinstructions': 'recipeInstructions',
        'videodescription': 'videoDescription',
        'videourl': 'videoUrl',
        'contenturl': 'contentUrl',
        'videouploaddate': 'uploadDate',
        'instructiontype': 'instructionType',
        'phonenumber': 'telephone',
        'pricerange': 'priceRange',
        'opendays': 'dayOfWeek',
        'openingtime': 'opens',
        'closingtime': 'closes',
        'servescuisine': 'servesCuisine',
        'menuurl': 'hasMenu',
        'embedurl': 'embedUrl',
        'streetaddress': 'streetAddress',
        'postalcode': 'postalCode',
        'addresslocality': 'addressLocality',
        'addressregion': 'addressRegion',
        'addresscountry': 'addressCountry'
      };

      Object.keys(fieldValues).forEach(k => {
        if (k !== 'name' && k !== 'description' && k !== 'price' && k !== 'currency' && k !== 'availability') {
          const properKey = schemaPropertyMap[k] || k;
          try {
            graphNode[properKey] = JSON.parse(fieldValues[k]);
          } catch {
            graphNode[properKey] = fieldValues[k];
          }
        }
      });
      baseObj = schemaObj;
    }

    const resolvedObj = resolveObjectVariables(baseObj, { title, seoTitle, metaDescription, redirectUrl, focusKeyword, featuredImage, globalSettings });
    const filteredObj = removeEmptyFields(resolvedObj);
    
    if (filteredObj && filteredObj["@graph"] && Array.isArray(filteredObj["@graph"]) && filteredObj["@graph"].length > 0) {
      return {
        "@context": "https://schema.org",
        "@graph": filteredObj["@graph"]
      };
    }
    
    return baseObj;
  };

  useEffect(() => {
    if (schemaJson && schemas.length === 0) {
      try {
        const parsed = JSON.parse(schemaJson);
        if (Array.isArray(parsed)) {
          setSchemas(parsed);
        } else if (parsed && typeof parsed === 'object') {
          setSchemas([parsed]);
        }
      } catch(e) {}
    } else if ((!schemaJson || schemaJson === '[]') && schemas.length === 0 && Object.keys(globalSettings || {}).length > 0) {
      const defaultSchemaType = isPost ? globalSettings.seo_post_schema_type : globalSettings.seo_page_schema_type;
      
      if (defaultSchemaType && defaultSchemaType !== 'None') {
        const schemaObj = {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": defaultSchemaType
            }
          ]
        };
        setSchemas([schemaObj]);
        if (setSchemaJson) {
          setSchemaJson(JSON.stringify([schemaObj], null, 2));
        }
      }
    }
  }, [schemaJson, schemas.length, globalSettings, isPost, setSchemaJson]);

  const updateSchemas = (newSchemas: any[]) => {
    setSchemas(newSchemas);
    if (setSchemaJson) {
      setSchemaJson(JSON.stringify(newSchemas, null, 2));
    }
  };

  const handleSchemaDataChange = (fieldLabel: string, value: string) => {
    setSchemaData(prev => ({
      ...prev,
      [`${selectedSchema}_${fieldLabel}`]: value
    }));
  };

  const schemaTypes = [
    { name: 'Article', icon: FileText, pro: false },
    { name: 'Book', icon: Book, pro: false },
    { name: 'Course', icon: GraduationCap, pro: false },
    { name: 'Dataset', icon: Database, pro: false },
    { name: 'Event', icon: Calendar, pro: false },
    { name: 'FAQ', icon: List, pro: false },
    { name: 'Fact Check', icon: CheckSquare, pro: false },
    { name: 'HowTo', icon: HelpCircle, pro: false },
    { name: 'Job Posting', icon: Briefcase, pro: false },
    { name: 'Movie', icon: Film, pro: false },
    { name: 'Music', icon: Music, pro: false },
    { name: 'Person', icon: User, pro: false },
    { name: 'Podcast Episode', icon: Mic, pro: false },
    { name: 'Product', icon: ShoppingCart, pro: false },
    { name: 'Recipe', icon: Utensils, pro: false },
    { name: 'Restaurant', icon: UtensilsCrossed, pro: false },
    { name: 'Service', icon: Settings, pro: false },
    { name: 'Software', icon: LayoutGrid, pro: false },
    { name: 'Video', icon: Video, pro: false }
  ];

  const toggleAccordion = (section: keyof typeof expanded) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Keyword array parsing
  const keywordsArray = focusKeyword.split(',').map(k => k.trim()).filter(k => k.length > 0);
  const primaryKeyword = keywordsArray[0] || '';

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim() && keywordsArray.length < 5 && !keywordsArray.includes(inputValue.trim())) {
        setFocusKeyword([...keywordsArray, inputValue.trim()].join(', '));
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && inputValue === '' && keywordsArray.length > 0) {
      const newArr = [...keywordsArray];
      newArr.pop();
      setFocusKeyword(newArr.join(', '));
    }
  };

  const removeKeyword = (index: number) => {
    const newArr = [...keywordsArray];
    newArr.splice(index, 1);
    setFocusKeyword(newArr.join(', '));
  };

  // SEO Score Logic
  const safeKeyword = primaryKeyword.toLowerCase();
  const safeTitle = (seoTitle || title).toLowerCase();
  const safeDesc = metaDescription.toLowerCase();
  const fullContent = customFieldsText ? content + ' ' + customFieldsText : content;
  const safeContent = fullContent.toLowerCase();
  const safeSlug = slug.toLowerCase();

  const hasKeyword = safeKeyword.length > 0;
  
  const keywordInTitle = hasKeyword && safeTitle.includes(safeKeyword);
  const keywordInDesc = hasKeyword && safeDesc.includes(safeKeyword);
  const normalizedSlug = safeSlug.replace(/[-_]/g, ' ');
  const keywordInSlug = hasKeyword && normalizedSlug.includes(safeKeyword);
  const plainTextContent = fullContent.replace(/<[^>]*>?/gm, '').toLowerCase();
  const keywordAtStartContent = hasKeyword && plainTextContent.substring(0, 150).includes(safeKeyword);
  const keywordInContent = hasKeyword && plainTextContent.includes(safeKeyword);
  
  const wordCount = plainTextContent.split(/\s+/).filter(w => w.length > 0).length;
  const wordCountGood = wordCount >= 600;

  const basicChecks = [
    { pass: keywordInTitle, text: 'Add Focus Keyword to the SEO title.', passedText: 'Focus Keyword found in the SEO title.' },
    { pass: keywordInDesc, text: 'Add Focus Keyword to your SEO Meta Description.', passedText: 'Focus Keyword found in your SEO Meta Description.' },
    { pass: keywordInSlug, text: 'Use Focus Keyword in the URL.', passedText: 'Focus Keyword used in the URL.' },
    { pass: keywordAtStartContent, text: 'Use Focus Keyword at the beginning of your content.', passedText: 'Focus Keyword appears in the first 10% of the content.' },
    { pass: keywordInContent, text: 'Use Focus Keyword in the content.', passedText: 'Focus Keyword found in the content.' },
    { pass: wordCountGood, text: `Content is ${wordCount} words long. Consider using at least 600 words.`, passedText: `Content is ${wordCount} words long. Good job!` }
  ];
  const basicErrors = basicChecks.filter(c => !c.pass).length;

  const headings: string[] = fullContent.match(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/ig) || [];
  const keywordInH2 = hasKeyword && headings.some(h => h.toLowerCase().includes(safeKeyword)); 
  const keywordInImageAlt = hasKeyword && safeContent.includes(`alt="`) && safeContent.includes(safeKeyword);
  
  const keywordCount = hasKeyword ? (safeContent.match(new RegExp(safeKeyword, 'g')) || []).length : 0;
  const keywordDensity = wordCount > 0 ? ((keywordCount / wordCount) * 100).toFixed(1) : "0.0";
  const densityGood = parseFloat(keywordDensity) > 0.5 && parseFloat(keywordDensity) < 2.5;
  
  const urlLengthGood = slug.length > 0 && slug.length <= 75;
  const hrefMatches: string[] = fullContent.match(/href="([^"]+)"/ig) || [];
  let hasInternalLinks = false;
  let hasOutboundLinks = false;
  
  hrefMatches.forEach(match => {
    const url = match.replace(/href="|"/ig, '');
    if (url.startsWith('/') || url.startsWith(origin || 'http://localhost')) {
      hasInternalLinks = true;
    } else if (url.startsWith('http')) {
      hasOutboundLinks = true;
    }
  });

  const additionalChecks = [
    { pass: keywordInH2, text: 'Use Focus Keyword in subheading(s) like H2, H3, H4, etc..', passedText: 'Focus Keyword found in subheading(s).' },
    { pass: keywordInImageAlt, text: 'Add an image with your Focus Keyword as alt text.', passedText: 'Focus Keyword found in image alt attributes.' },
    { pass: densityGood, text: `Keyword Density is ${keywordDensity}. Aim for around 1% Keyword Density.`, passedText: `Keyword Density is ${keywordDensity}, which is great.` },
    { pass: urlLengthGood, text: `URL is ${slug.length || 0} characters long. Aim for short URLs.`, passedText: `URL is ${slug.length} characters long. Kudos!` },
    { pass: hasOutboundLinks, text: 'No outbound links were found. Link out to external resources.', passedText: 'Great! You are linking to external resources.' },
    { pass: hasInternalLinks, text: 'Add internal links to other resources on your website.', passedText: 'You are linking to other resources on your website which is great.' },
    { pass: hasKeyword, text: 'Set a Focus Keyword for this content.', passedText: 'Focus Keyword is set.' },
    { pass: true, text: '', passedText: 'You are using Content AI to optimise this Page.' } 
  ];
  const additionalErrors = additionalChecks.filter(c => !c.pass).length;

  const keywordNearStartTitle = hasKeyword && safeTitle.indexOf(safeKeyword) < 20 && safeTitle.indexOf(safeKeyword) >= 0;
  const hasSentiment = /amazing|best|worst|great|terrible|awesome/i.test(safeTitle);
  const hasPowerWord = /exclusive|secret|guaranteed|proven/i.test(safeTitle);
  const hasNumberInTitle = /\d/.test(safeTitle);

  const titleChecks = [
    { pass: keywordNearStartTitle, text: 'Use the Focus Keyword near the beginning of SEO title.', passedText: 'Focus Keyword placed near the beginning of SEO title.' },
    { pass: hasSentiment, text: "Your title doesn't contain a positive or a negative sentiment word.", passedText: 'Your title contains a sentiment word.' },
    { pass: hasPowerWord, text: "Your title doesn't contain a power word. Add at least one.", passedText: 'Your title contains at least one power word.' },
    { pass: hasNumberInTitle, text: "Your SEO title doesn't contain a number.", passedText: 'Your SEO title contains a number.' }
  ];
  const titleErrors = titleChecks.filter(c => !c.pass).length;

  const hasToc = false; 
  const hasShortParagraphs = !/(<p>[\s\S]*?<\/p>\s*){5,}/i.test(content); 
  const hasMedia = /<(img|video|iframe)/i.test(content);

  const contentChecks = [
    { pass: hasToc, text: "You don't seem to be using a Table of Contents plugin.", passedText: "You are using a Table of Contents plugin." },
    { pass: hasShortParagraphs, text: "Your paragraphs are too long. Use short paragraphs.", passedText: "You are using short paragraphs." },
    { pass: hasMedia, text: "You are not using rich media like images or videos.", passedText: "You are using rich media." }
  ];
  const contentErrors = contentChecks.filter(c => !c.pass).length;

  const totalChecks = basicChecks.length + additionalChecks.length + titleChecks.length + contentChecks.length;
  const passedChecks = [...basicChecks, ...additionalChecks, ...titleChecks, ...contentChecks].filter(c => c.pass).length;
  // If no focus keyword is set, default the score to 0 to mimic Rank Math
  const score = hasKeyword ? Math.round((passedChecks / totalChecks) * 100) || 0 : 0;
  
  useEffect(() => {
    if (onScoreChange) onScoreChange(score);
  }, [score, onScoreChange]);

  let scoreColor = 'bg-red-100 text-red-600 border-red-200';
  if (score > 50) scoreColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (score >= 80) scoreColor = 'bg-green-100 text-green-700 border-green-200';

  const seoContext = {
    title,
    siteName: liveSettings?.site_title || 'Velocity Consultancy',
    separator: liveSettings?.seo_separator || '-',
    excerpt: content.replace(/<[^>]*>?/gm, '').substring(0, 160),
    siteDesc: liveSettings?.site_tagline || 'Digital Marketing & Web Agency',
    authorName: 'Admin', // Fallback for preview
    authorId: '1',
    category: 'Uncategorized', // Fallback for preview
    postId: '123',
    postDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    modifiedDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  };
  const fallbackTitle = isPost 
    ? (globalSettings?.seo_post_title || '%title% %sep% %sitename%')
    : (globalSettings?.seo_page_title || '%title% %sep% %sitename%');

  const fallbackDesc = isPost
    ? (globalSettings?.seo_post_desc || '%excerpt%')
    : (globalSettings?.seo_page_desc || '%excerpt%');

  const activeSeoTitle = seoTitle || fallbackTitle;
  const activeMetaDesc = metaDescription || fallbackDesc;

  const resolvedTitleLength = getResolvedLength(activeSeoTitle, seoContext);
  const resolvedDescLength = getResolvedLength(activeMetaDesc, seoContext);

  return (
    <div className="w-full bg-white border border-[#c3c4c7] shadow-sm font-sans mb-8">
      {/* Meta Box Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#c3c4c7] bg-white">
        <h2 className="text-[14px] font-semibold text-[#1d2327]">SEO</h2>
        <div className="flex items-center gap-1 text-gray-500">
          <ChevronUp className="w-5 h-5 cursor-pointer hover:text-blue-600" />
          <ChevronDown className="w-5 h-5 cursor-pointer hover:text-blue-600" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e2e4e7] bg-[#f9f9f9]">
        <button type="button" onClick={() => setActiveTab('general')} className={`flex items-center gap-2 px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-[#0085ba] text-[#0085ba] bg-white' : 'border-transparent text-[#50575e] hover:text-[#0085ba]'}`}><Cog className="w-4 h-4" /> General</button>
        <button type="button" onClick={() => setActiveTab('advanced')} className={`flex items-center gap-2 px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${activeTab === 'advanced' ? 'border-[#0085ba] text-[#0085ba] bg-white' : 'border-transparent text-[#50575e] hover:text-[#0085ba]'}`}><Briefcase className="w-4 h-4" /> Advanced</button>
        <button type="button" onClick={() => setActiveTab('schema')} className={`flex items-center gap-2 px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${activeTab === 'schema' ? 'border-[#0085ba] text-[#0085ba] bg-white' : 'border-transparent text-[#50575e] hover:text-[#0085ba]'}`}><FileText className="w-4 h-4" /> Schema</button>
        <button type="button" onClick={() => setActiveTab('social')} className={`flex items-center gap-2 px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${activeTab === 'social' ? 'border-[#0085ba] text-[#0085ba] bg-white' : 'border-transparent text-[#50575e] hover:text-[#0085ba]'}`}><Share2 className="w-4 h-4" /> Social</button>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="bg-white">
          <div className="p-5 border-b border-[#e2e4e7]">
            <h3 className="text-[13px] font-semibold text-[#1d2327] mb-3">Preview</h3>
            <div className="mb-4">
              <div className="text-[13px] text-[#006621] truncate mb-1">{origin || 'http://localhost:3000'}/{slug || 'sample-page'}/ <span className="text-gray-400">⋮</span></div>
              <div className="text-[18px] text-[#1a0dab] font-medium hover:underline cursor-pointer truncate mb-1">
                {resolveSeoVariables(activeSeoTitle, seoContext) || title || 'Sample Page - Test'}
              </div>
              <div className="text-[13px] text-[#545454] leading-snug line-clamp-2">
                {resolveSeoVariables(activeMetaDesc, seoContext) || "This is an example page. It's different from a blog post because it will stay in one place and will show up in your site navigation."}
              </div>
            </div>
            <button type="button" onClick={() => setIsSnippetExpanded(!isSnippetExpanded)} className="bg-[#0085ba] text-white text-[13px] px-4 py-1.5 rounded-[3px] hover:bg-[#0073aa] transition-colors">Edit Snippet</button>
            {isSnippetExpanded && (
              <div className="mt-4 p-4 bg-[#f9f9f9] border border-[#e2e4e7] rounded-sm space-y-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-[#1d2327]">
                      Title
                      {!seoTitle && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-normal">Inheriting Global</span>}
                    </label>
                    <span className="text-[11px] text-gray-500">
                      {Math.max(0, 60 - resolvedTitleLength)} characters remaining
                    </span>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder={fallbackTitle} 
                      value={seoTitle || ''} 
                      onChange={(e) => setSeoTitle && setSeoTitle(e.target.value)} 
                      className="w-full border border-[#8c8f94] rounded-[3px] pl-3 pr-8 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none" 
                    />
                    <div className="absolute right-2 top-2">
                      <ChevronDown className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" onClick={() => {
                        setIsTitleVarsOpen(!isTitleVarsOpen);
                        setIsDescVarsOpen(false);
                      }} />
                    </div>
                    {isTitleVarsOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-sm shadow-xl z-50 max-h-60 overflow-y-auto" onMouseLeave={() => setIsTitleVarsOpen(false)}>
                        {SEO_VARIABLES.map(v => (
                          <div 
                            key={v.tag}
                            onClick={() => {
                              if (setSeoTitle) {
                                setSeoTitle((seoTitle || '') + (seoTitle ? ' ' : '') + `%${v.tag}%`);
                              }
                              setIsTitleVarsOpen(false);
                            }}
                            className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer group"
                          >
                            <div className="flex flex-col">
                              <span className="text-[13px] font-semibold text-gray-800">{v.label}</span>
                              <span className="text-[11px] text-gray-500 italic">{v.desc}</span>
                            </div>
                            <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-1 rounded group-hover:bg-gray-200">{v.tag}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`h-1 mt-1 rounded-full ${resolvedTitleLength > 40 && resolvedTitleLength <= 60 ? 'bg-green-500' : resolvedTitleLength > 60 ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(100, (resolvedTitleLength / 60) * 100)}%` }} />
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[13px] font-semibold text-[#1d2327]">Permalink</label>
                    <span className="text-[11px] text-gray-500">
                      {Math.max(0, 75 - slug.length)} characters remaining
                    </span>
                  </div>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none" />
                  <div className={`h-1 mt-1 rounded-full ${slug.length > 0 && slug.length <= 75 ? 'bg-green-500' : slug.length > 75 ? 'bg-red-500' : 'bg-gray-300'}`} style={{ width: `${Math.min(100, (slug.length / 75) * 100)}%` }} />
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-[#1d2327]">
                      Description
                      {!metaDescription && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-normal">Inheriting Global</span>}
                    </label>
                    <span className="text-[11px] text-gray-500">
                      {Math.max(0, 160 - resolvedDescLength)} characters remaining
                    </span>
                  </div>
                  <div className="relative">
                    <textarea 
                      placeholder={fallbackDesc}
                      value={metaDescription || ''} 
                      onChange={(e) => setMetaDescription && setMetaDescription(e.target.value)} 
                      rows={3} 
                      className="w-full border border-[#8c8f94] rounded-[3px] pl-3 pr-8 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none resize-y" 
                    />
                    <div className="absolute right-2 top-2">
                      <ChevronDown className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" onClick={() => {
                        setIsDescVarsOpen(!isDescVarsOpen);
                        setIsTitleVarsOpen(false);
                      }} />
                    </div>
                    {isDescVarsOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-sm shadow-xl z-50 max-h-60 overflow-y-auto" onMouseLeave={() => setIsDescVarsOpen(false)}>
                        {SEO_VARIABLES.map(v => (
                          <div 
                            key={v.tag}
                            onClick={() => {
                              if (setMetaDescription) {
                                setMetaDescription((metaDescription || '') + (metaDescription ? ' ' : '') + `%${v.tag}%`);
                              }
                              setIsDescVarsOpen(false);
                            }}
                            className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer group"
                          >
                            <div className="flex flex-col">
                              <span className="text-[13px] font-semibold text-gray-800">{v.label}</span>
                              <span className="text-[11px] text-gray-500 italic">{v.desc}</span>
                            </div>
                            <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-1 rounded group-hover:bg-gray-200">{v.tag}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`h-1 mt-1 rounded-full ${resolvedDescLength > 120 && resolvedDescLength <= 160 ? 'bg-green-500' : resolvedDescLength > 160 ? 'bg-red-500' : resolvedDescLength > 0 ? 'bg-yellow-500' : 'bg-gray-300'}`} style={{ width: `${Math.min(100, (resolvedDescLength / 160) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="p-5 border-b border-[#e2e4e7]">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1 text-[13px] font-semibold text-[#1d2327]">Focus Keyword <HelpCircle className="w-3.5 h-3.5 text-gray-400" /></label>
              <TrendingUp className="w-5 h-5 text-gray-400 p-0.5 border border-gray-300 rounded-sm shadow-sm" />
            </div>
            <div className="relative flex items-center flex-wrap gap-1.5 border border-[#8c8f94] rounded-[3px] p-1.5 focus-within:border-[#0085ba] focus-within:ring-1 focus-within:ring-[#0085ba] pr-20 bg-white">
              {keywordsArray.map((keyword, index) => {
                const isPrimary = index === 0;
                return (
                  <div key={index} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium shadow-sm border ${isPrimary ? 'bg-[#f5a623] text-white border-[#e0961b]' : 'bg-[#fff5f5] text-[#d63f45] border-[#fbd3d3]'}`}>
                    <button type="button" onClick={() => removeKeyword(index)} className="hover:opacity-70 transition-opacity flex items-center justify-center bg-black/10 rounded-full w-3.5 h-3.5"><X className="w-2.5 h-2.5" /></button>
                    {isPrimary && <Star className="w-3 h-3 fill-current" />} {keyword}
                  </div>
                );
              })}
              {keywordsArray.length < 5 && <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeywordKeyDown} placeholder={keywordsArray.length === 0 ? "Insert keyword and press Enter" : ""} className="flex-1 min-w-[120px] outline-none text-[13px] bg-transparent py-0.5 px-1" />}
              <div className={`absolute right-1 top-1 bottom-1 px-3 flex items-center justify-center font-semibold text-[13px] rounded-[2px] border bg-white z-10 ${scoreColor}`}>{score} / 100</div>
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Add up to 5 focus keywords.</div>


          </div>
          <Accordion title="Basic SEO" errors={basicErrors} expanded={expanded.basic} onToggle={() => toggleAccordion('basic')} checks={basicChecks} />
          <Accordion title="Additional" errors={additionalErrors} expanded={expanded.additional} onToggle={() => toggleAccordion('additional')} checks={additionalChecks} />
          <Accordion title="Title Readability" errors={titleErrors} expanded={expanded.title} onToggle={() => toggleAccordion('title')} checks={titleChecks} />
          <Accordion title="Content Readability" errors={contentErrors} expanded={expanded.content} onToggle={() => toggleAccordion('content')} checks={contentChecks} />
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="bg-white p-5 space-y-6">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 text-[13px] font-semibold text-[#1d2327] uppercase">Robots Meta</div>
            <div className="col-span-8">
              {(() => {
                const isInherited = seoRobots == null;
                const localRobots = seoRobots ? seoRobots.split(',').filter(Boolean) : [];
                const specificGlobalRobots = isPost ? globalSettings?.seo_post_robots : globalSettings?.seo_page_robots;
                const specificGlobalRobotsValid = specificGlobalRobots && specificGlobalRobots !== 'default' ? specificGlobalRobots : null;
                const globalRobotsStr = specificGlobalRobotsValid || globalSettings?.seo_global_robots || 'index';
                const globalRobots = globalRobotsStr.split(',').filter(Boolean);
                
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-[13px] text-[#1d2327]">
                      {['Index', 'No Index', 'No Follow', 'No Archive', 'No Image Index', 'No Snippet'].map(robot => {
                        const val = robot.toLowerCase().replace(' ', '');
                        const isChecked = isInherited ? globalRobots.includes(val) : localRobots.includes(val);

                        return (
                          <label key={robot} className={`flex items-center gap-2 ${isInherited ? 'opacity-70' : ''}`}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                if (!setSeoRobots) return;
                                
                                let newRobots = isInherited ? [...globalRobots] : [...localRobots];
                                
                                if (e.target.checked) {
                                  newRobots.push(val);
                                  if (val === 'index') newRobots = newRobots.filter(r => r !== 'noindex');
                                  if (val === 'noindex') newRobots = newRobots.filter(r => r !== 'index');
                                } else {
                                  newRobots = newRobots.filter(r => r !== val);
                                }
                                
                                newRobots = Array.from(new Set(newRobots));
                                setSeoRobots(newRobots.join(','));
                              }}
                              className="text-[#0085ba]" 
                            /> 
                            {robot} {isInherited && <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-500 ml-1">Default</span>} <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                          </label>
                        );
                      })}
                    </div>
                    
                    {!isInherited && (
                      <button 
                        type="button" 
                        onClick={() => setSeoRobots && setSeoRobots(null)} 
                        className="mt-3 text-[12px] text-red-600 hover:underline flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Reset to Global Default
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          <hr className="border-[#e2e4e7]" />
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 text-[13px] font-semibold text-[#1d2327] uppercase">Advanced Robots Meta</div>
            <div className="col-span-8">
              {(() => {
                const isAdvancedInherited = seoAdvancedRobots == null;
                const parseAdvanced = (str: string | null | undefined) => {
                  if (!str) return {};
                  const obj: Record<string, string> = {};
                  str.split(',').forEach(pair => {
                    const [k, v] = pair.split(':');
                    if (k && v) obj[k] = v;
                  });
                  return obj;
                };
                
                const localAdvanced = parseAdvanced(seoAdvancedRobots);
                
                const specificPrefix = isPost ? 'seo_post_adv_' : 'seo_page_adv_';
                const specificAdvanced: Record<string, string> = {};
                if (globalSettings?.[specificPrefix + 'snippet_val']) specificAdvanced['max-snippet'] = globalSettings[specificPrefix + 'snippet_val'];
                if (globalSettings?.[specificPrefix + 'video_val']) specificAdvanced['max-video-preview'] = globalSettings[specificPrefix + 'video_val'];
                if (globalSettings?.[specificPrefix + 'image_val']) specificAdvanced['max-image-preview'] = globalSettings[specificPrefix + 'image_val'].toLowerCase();
                
                const globalPrefix = 'seo_global_adv_';
                const fallbackAdvanced: Record<string, string> = {};
                if (globalSettings?.[globalPrefix + 'snippet'] === 'true' && globalSettings?.[globalPrefix + 'snippet_val']) fallbackAdvanced['max-snippet'] = globalSettings[globalPrefix + 'snippet_val'];
                if (globalSettings?.[globalPrefix + 'video'] === 'true' && globalSettings?.[globalPrefix + 'video_val']) fallbackAdvanced['max-video-preview'] = globalSettings[globalPrefix + 'video_val'];
                if (globalSettings?.[globalPrefix + 'image'] === 'true' && globalSettings?.[globalPrefix + 'image_val']) fallbackAdvanced['max-image-preview'] = globalSettings[globalPrefix + 'image_val'].toLowerCase();

                const globalAdvanced = Object.keys(specificAdvanced).length > 0 ? specificAdvanced : fallbackAdvanced;
                const currentAdvanced = isAdvancedInherited ? globalAdvanced : localAdvanced;
                
                const handleAdvancedChange = (key: string, checked: boolean, value: string) => {
                  if (!setSeoAdvancedRobots) return;
                  let newAdvanced = { ...currentAdvanced };
                  if (checked) {
                    newAdvanced[key] = value;
                  } else {
                    delete newAdvanced[key];
                  }
                  
                  const newStr = Object.entries(newAdvanced).map(([k, v]) => `${k}:${v}`).join(',');
                  setSeoAdvancedRobots(newStr); // If empty, saves as "" which is a valid explicit override
                };

                return (
                  <>
                    <div className="space-y-3 text-[13px] text-[#1d2327]">
                      <div className={`flex items-center gap-4 ${isAdvancedInherited ? 'opacity-70' : ''}`}>
                         <label className="flex items-center gap-2 w-40">
                           <input 
                             type="checkbox" 
                             checked={'max-snippet' in currentAdvanced} 
                             onChange={e => handleAdvancedChange('max-snippet', e.target.checked, '-1')}
                             className="text-[#0085ba]" 
                           /> 
                           Max Snippet {isAdvancedInherited && <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-500 ml-1">Default</span>} <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                         </label>
                         <input 
                           type="text" 
                           value={currentAdvanced['max-snippet'] || ''} 
                           onChange={e => handleAdvancedChange('max-snippet', true, e.target.value)}
                           disabled={!('max-snippet' in currentAdvanced)}
                           className="border border-[#8c8f94] rounded-[3px] px-3 py-1 w-24 outline-none disabled:bg-gray-100" 
                         />
                      </div>
                      <div className={`flex items-center gap-4 ${isAdvancedInherited ? 'opacity-70' : ''}`}>
                         <label className="flex items-center gap-2 w-40">
                           <input 
                             type="checkbox" 
                             checked={'max-video-preview' in currentAdvanced} 
                             onChange={e => handleAdvancedChange('max-video-preview', e.target.checked, '-1')}
                             className="text-[#0085ba]" 
                           /> 
                           Max Video Preview {isAdvancedInherited && <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-500 ml-1">Default</span>} <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                         </label>
                         <input 
                           type="text" 
                           value={currentAdvanced['max-video-preview'] || ''}
                           onChange={e => handleAdvancedChange('max-video-preview', true, e.target.value)}
                           disabled={!('max-video-preview' in currentAdvanced)}
                           className="border border-[#8c8f94] rounded-[3px] px-3 py-1 w-24 outline-none disabled:bg-gray-100" 
                         />
                      </div>
                      <div className={`flex items-center gap-4 ${isAdvancedInherited ? 'opacity-70' : ''}`}>
                         <label className="flex items-center gap-2 w-40">
                           <input 
                             type="checkbox" 
                             checked={'max-image-preview' in currentAdvanced} 
                             onChange={e => handleAdvancedChange('max-image-preview', e.target.checked, 'large')}
                             className="text-[#0085ba]" 
                           /> 
                           Max Image Preview {isAdvancedInherited && <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-500 ml-1">Default</span>} <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                         </label>
                         <select 
                           value={currentAdvanced['max-image-preview'] || 'large'}
                           onChange={e => handleAdvancedChange('max-image-preview', true, e.target.value)}
                           disabled={!('max-image-preview' in currentAdvanced)}
                           className="border border-[#8c8f94] rounded-[3px] px-3 py-1 w-32 outline-none disabled:bg-gray-100"
                         >
                           <option value="large">Large</option>
                           <option value="standard">Standard</option>
                           <option value="none">None</option>
                         </select>
                      </div>
                    </div>
                    
                    {!isAdvancedInherited && (
                      <button 
                        type="button" 
                        onClick={() => setSeoAdvancedRobots && setSeoAdvancedRobots(null)} 
                        className="mt-3 text-[12px] text-red-600 hover:underline flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Reset to Global Default
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          <hr className="border-[#e2e4e7]" />
          <div className="grid grid-cols-12 gap-4 items-center">
             <div className="col-span-4 text-[13px] font-semibold text-[#1d2327] flex items-center gap-1">Canonical URL <HelpCircle className="w-3.5 h-3.5 text-gray-400" /></div>
             <div className="col-span-8"><input type="text" placeholder={`${globalSettings?.site_url || origin || 'http://localhost:3000'}/${slug || ''}`} className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-2 text-[13px] outline-none focus:border-[#0085ba]" /></div>
          </div>
          <hr className="border-[#e2e4e7]" />
          <div className="grid grid-cols-12 gap-4 items-start">
             <div className="col-span-4 text-[13px] font-semibold text-[#1d2327] mt-1">Redirect</div>
              <div className="col-span-8 space-y-4">
                <div onClick={() => {
                  const newIsRedirect = !isRedirect;
                  setIsRedirect(newIsRedirect);
                  if (!newIsRedirect && setRedirectUrl) setRedirectUrl('');
                }} className={`w-9 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${isRedirect ? 'bg-[#0085ba]' : 'bg-gray-300'}`}>
                   <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${isRedirect ? 'left-4' : 'left-0.5'}`}></div>
                </div>
                {isRedirect && (
                  <div className="space-y-3 bg-[#f9f9f9] p-4 border border-[#e2e4e7] rounded-[3px]">
                     <div>
                       <label className="block text-[12px] font-semibold text-[#1d2327] mb-1">Redirection Type</label>
                       <select value={redirectType || '301'} onChange={(e) => setRedirectType && setRedirectType(e.target.value)} className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] outline-none"><option value="301">301 Permanent Move</option><option value="302">302 Temporary Move</option></select>
                     </div>
                     <div>
                       <label className="block text-[12px] font-semibold text-[#1d2327] mb-1">Destination URL</label>
                       <input type="text" value={redirectUrl || ''} onChange={(e) => setRedirectUrl && setRedirectUrl(e.target.value)} placeholder="https://example.com" className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] outline-none" />
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'schema' && (
        <div className="bg-white p-5 space-y-6 min-h-[300px]">
          <div className="flex items-center justify-between border-b border-[#e2e4e7] pb-4">
            <h3 className="text-[14px] font-semibold text-[#1d2327]">Schema in Use</h3>
            <button type="button" onClick={() => { setEditingSchemaIndex(null); setIsSchemaModalOpen(true); }} className="bg-[#0085ba] text-white text-[13px] px-4 py-1.5 rounded-[3px] hover:bg-[#0073aa] transition-colors">Schema Generator</button>
          </div>
          
          {schemas.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-[3px] p-8 text-center text-gray-500 text-[13px]">
              No schemas added yet. Click Schema Generator to add one.
            </div>
          ) : (
            <div className="space-y-3">
              {schemas.map((s, i) => (
                <div key={i} className="border border-[#e2e4e7] rounded-[3px] p-4 flex items-center justify-between hover:border-[#0085ba] transition-colors bg-[#f9f9f9]">
                  <div className="flex items-center gap-3">
                     <FileText className="w-5 h-5 text-gray-500" />
                     <span className="text-[13px] font-medium text-[#1d2327]">{s['@type'] || (Array.isArray(s['@graph']) ? s['@graph'][0]?.['@type'] : s['@graph']?.['@type']) || 'Custom Schema'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[13px] text-[#0085ba] font-semibold">
                     <button type="button" onClick={() => { 
                       setEditingSchemaIndex(i); 
                       const rawType = s['@type'] || (Array.isArray(s['@graph']) ? s['@graph'][0]?.['@type'] : s['@graph']?.['@type']);
                       const type = mapSchemaType(rawType) || 'Custom';
                       const data = Array.isArray(s['@graph']) ? s['@graph'][0] : (s['@graph'] || s);
                       let hasUnmappedKeys = false;
                       if (type !== 'Custom' && type !== 'FAQ' && schemaFieldDefinitions[type]) {
                         hasUnmappedKeys = Object.keys(data).some(k => {
                           const key = k.toLowerCase();
                           if (['@context', '@type', '@graph', '@id'].includes(key) || (type === 'FAQ' && key === 'mainentity')) return false;
                           
                           // Ignore common bundled WebPage properties that users don't care about when editing specific schemas like FAQ
                           if (['url', 'datepublished', 'datemodified', 'inlanguage', 'potentialaction', 'publisher', 'description', 'author', 'mainentityofpage', 'name', 'image', 'subjectof', 'offers'].includes(key)) return false;
                           
                           return !schemaFieldDefinitions[type].find(f => f.label.replace(/\s*\*\s*$/, '').replace(/ /g, '').toLowerCase() === key);
                         });
                       }
                       if (type !== 'Custom' && schemaFieldDefinitions[type] && !hasUnmappedKeys) {
                         setSelectedSchema(type);
                         const newData: Record<string, string> = {};
                         if (type === 'FAQ' && data.mainEntity) {
                           const flatQuestions = (Array.isArray(data.mainEntity) ? data.mainEntity : [data.mainEntity]).map((q: any) => ({
                             question: q.name, url: q.url, image: q.image, answer: q.acceptedAnswer?.text || q.acceptedAnswer
                           }));
                           newData[`FAQ_Questions`] = JSON.stringify(flatQuestions);
                         }
                         if (type === 'Service') {
                           if (data.name) newData[`Service_HEADLINE *`] = data.name;
                           if (data.description) newData[`Service_DESCRIPTION`] = data.description;
                           if (data.offers?.price) newData[`Service_PRICE`] = String(data.offers.price);
                           if (data.offers?.priceCurrency) newData[`Service_CURRENCY`] = String(data.offers.priceCurrency);
                           if (data.subjectOf && data.subjectOf[0]?.mainEntity) {
                             const flatQuestions = (Array.isArray(data.subjectOf[0].mainEntity) ? data.subjectOf[0].mainEntity : [data.subjectOf[0].mainEntity]).map((q: any) => ({
                               question: q.name, url: q.url, image: q.image, answer: q.acceptedAnswer?.text || q.acceptedAnswer
                             }));
                             newData[`Service_Questions`] = JSON.stringify(flatQuestions);
                           }
                         }
                         Object.keys(data).forEach(k => {
                           if (k !== '@context' && k !== '@type' && k !== '@graph' && !(type === 'FAQ' && k === 'mainEntity') && !(type === 'FAQ' && k === 'name')) {
                             const fieldDef = schemaFieldDefinitions[type].find(f => f.label.replace(/\s*\*\s*$/, '').replace(/ /g, '').toLowerCase() === k.toLowerCase());
                             if (fieldDef) newData[`${type}_${fieldDef.label}`] = typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]);
                           }
                         });
                         setSchemaData(newData);
                         setIsSchemaBuilderOpen(true);
                       } else {
                         const parseObjToNodes = (obj: any, isRoot = true): SchemaNode[] => {
                           const processValue = (k: string, v: any): SchemaNode => {
                             if (typeof v === 'object' && v !== null) {
                               if (Array.isArray(v)) {
                                 const children = v.map((item, idx) => processValue(String(idx), item));
                                 return { id: Math.random().toString(36).substr(2, 9), key: k, value: '', type: 'group' as const, children };
                               } else {
                                 const children = Object.entries(v)
                                   .filter(([subK]) => subK !== '@context')
                                   .map(([subK, subV]) => processValue(subK, subV));
                                 return { id: Math.random().toString(36).substr(2, 9), key: k, value: '', type: 'group' as const, children };
                               }
                             }
                             return { id: Math.random().toString(36).substr(2, 9), key: k, value: String(v), type: 'property' as const, children: [] };
                           };
                           if (isRoot && typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                             const children = Object.entries(obj)
                               .filter(([k]) => k !== '@context')
                               .map(([k, v]) => processValue(k, v));
                             return [{ id: 'root-1', key: obj['@type'] || 'Custom', value: '', type: 'group' as const, children }];
                           }
                           return [{ id: 'root-1', key: 'Custom', value: '', type: 'group' as const, children: Array.isArray(obj) ? obj.map((item, idx) => processValue(String(idx), item)) : [] }];
                         };
                         setCustomSchemaNodes(parseObjToNodes(data));
                         setSelectedSchema('Custom');
                         setIsSchemaBuilderOpen(true);
                       }
                     }} className="hover:underline">Edit</button>
                     <button type="button" onClick={() => {
                       const newSchemas = [...schemas];
                       newSchemas.splice(i, 1);
                       updateSchemas(newSchemas);
                     }} className="text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[13px] text-gray-500 mt-4">
            Schema Markup helps search engines understand your content better and can enhance your search results with rich snippets.
          </p>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="bg-white p-5 space-y-6 min-h-[300px]">
          <h3 className="text-[14px] font-semibold text-[#1d2327] mb-4">Social Preview</h3>
          <div className="border border-[#e2e4e7] rounded-[3px] overflow-hidden max-w-sm">
             <div className="h-40 bg-gray-200 flex items-center justify-center text-gray-400"><Share2 className="w-10 h-10 opacity-50" /></div>
             <div className="p-4 bg-[#f2f3f5]">
               <div className="text-[12px] text-gray-500 uppercase mb-1">yoursite.com</div>
               <div className="font-semibold text-[#1d2327] line-clamp-1">{title || 'Sample Title'}</div>
               <div className="text-[13px] text-gray-600 line-clamp-2 mt-1">{metaDescription || 'Sample description for social sharing.'}</div>
             </div>
          </div>
        </div>
      )}

      {/* Schema Generator Modal */}
      {isSchemaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[3px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
             <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e4e7]">
               <h2 className="text-[16px] font-semibold text-[#1d2327]">Schema Generator</h2>
               <button type="button" onClick={() => setIsSchemaModalOpen(false)} className="hover:bg-gray-100 p-1 rounded transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
             </div>
             <div className="flex px-6 border-b border-[#e2e4e7] bg-[#f9f9f9]">
               <button type="button" onClick={() => setSchemaModalTab('templates')} className={`flex items-center gap-2 px-6 py-4 text-[13px] font-medium border-b-2 transition-colors ${schemaModalTab === 'templates' ? 'border-[#0085ba] text-[#0085ba] bg-white' : 'border-transparent text-[#50575e] hover:text-[#0085ba]'}`}><FileText className="w-4 h-4" /> Schema Templates</button>
               <button type="button" onClick={() => setSchemaModalTab('import')} className={`flex items-center gap-2 px-6 py-4 text-[13px] font-medium border-b-2 transition-colors ${schemaModalTab === 'import' ? 'border-[#0085ba] text-[#0085ba] bg-white' : 'border-transparent text-[#50575e] hover:text-[#0085ba]'}`}><Share2 className="w-4 h-4" /> Import</button>
               <button type="button" onClick={() => setSchemaModalTab('custom')} className={`flex items-center gap-2 px-6 py-4 text-[13px] font-medium border-b-2 transition-colors ${schemaModalTab === 'custom' ? 'border-[#0085ba] text-[#0085ba] bg-white' : 'border-transparent text-[#50575e] hover:text-[#0085ba]'}`}><PlusCircle className="w-4 h-4" /> Custom Schema</button>
             </div>
             <div className="flex-1 overflow-y-auto p-6 bg-white">
               {schemaModalTab === 'templates' && (
                  <div>
                    {schemas.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-[14px] font-semibold text-[#1d2327] mb-3">Schema in Use</h3>
                        <div className="space-y-2">
                          {schemas.map((s, i) => (
                            <div key={i} className="border border-[#0085ba] rounded-[3px] p-3 flex items-center justify-between bg-white">
                              <div className="flex items-center gap-3">
                                 <div className="w-4 h-4 rounded-full border-2 border-[#0085ba] flex items-center justify-center">
                                   <div className="w-2 h-2 rounded-full bg-[#0085ba]" />
                                 </div>
                                 <FileText className="w-4 h-4 text-gray-500" />
                                 <span className="text-[13px] text-[#50575e]">{s['@type'] || (Array.isArray(s['@graph']) ? s['@graph'][0]?.['@type'] : s['@graph']?.['@type']) || 'Custom Schema'}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[12px] text-gray-500">
                                 <button type="button" onClick={() => { 
                                   setEditingSchemaIndex(i); 
                                   const rawType = s['@type'] || (Array.isArray(s['@graph']) ? s['@graph'][0]?.['@type'] : s['@graph']?.['@type']);
                                   const type = mapSchemaType(rawType) || 'Custom';
                                   const data = Array.isArray(s['@graph']) ? s['@graph'][0] : (s['@graph'] || s);
                                   let hasUnmappedKeys = false;
                                   if (type !== 'Custom' && type !== 'FAQ' && schemaFieldDefinitions[type]) {
                                     hasUnmappedKeys = Object.keys(data).some(k => {
                                       const key = k.toLowerCase();
                                       if (['@context', '@type', '@graph', '@id'].includes(key) || (type === 'FAQ' && key === 'mainentity')) return false;
                                       
                                       if (['url', 'datepublished', 'datemodified', 'inlanguage', 'potentialaction', 'publisher', 'description', 'author', 'mainentityofpage', 'name', 'image', 'subjectof', 'offers'].includes(key)) return false;
                                       
                                       return !schemaFieldDefinitions[type].find(f => f.label.replace(/\s*\*\s*$/, '').replace(/ /g, '').toLowerCase() === key);
                                     });
                                   }
                                   if (type !== 'Custom' && schemaFieldDefinitions[type] && !hasUnmappedKeys) {
                                     setSelectedSchema(type);
                                     const newData: Record<string, string> = {};
                                     if (type === 'FAQ' && data.mainEntity) {
                                       const flatQuestions = (Array.isArray(data.mainEntity) ? data.mainEntity : [data.mainEntity]).map((q: any) => ({
                                         question: q.name, url: q.url, image: q.image, answer: q.acceptedAnswer?.text || q.acceptedAnswer
                                       }));
                                       newData[`FAQ_Questions`] = JSON.stringify(flatQuestions);
                                     }
                                     if (type === 'Service') {
                                       if (data.name) newData[`Service_HEADLINE *`] = data.name;
                                       if (data.description) newData[`Service_DESCRIPTION`] = data.description;
                                       if (data.offers?.price) newData[`Service_PRICE`] = String(data.offers.price);
                                       if (data.offers?.priceCurrency) newData[`Service_CURRENCY`] = String(data.offers.priceCurrency);
                                       if (data.subjectOf && data.subjectOf[0]?.mainEntity) {
                                         const flatQuestions = (Array.isArray(data.subjectOf[0].mainEntity) ? data.subjectOf[0].mainEntity : [data.subjectOf[0].mainEntity]).map((q: any) => ({
                                           question: q.name, url: q.url, image: q.image, answer: q.acceptedAnswer?.text || q.acceptedAnswer
                                         }));
                                         newData[`Service_Questions`] = JSON.stringify(flatQuestions);
                                       }
                                     }
                                     Object.keys(data).forEach(k => {
                                       if (k !== '@context' && k !== '@type' && k !== '@graph' && !(type === 'FAQ' && k === 'mainEntity') && !(type === 'FAQ' && k === 'name')) {
                                         const fieldDef = schemaFieldDefinitions[type].find(f => f.label.replace(/\s*\*\s*$/, '').replace(/ /g, '').toLowerCase() === k.toLowerCase());
                                         if (fieldDef) {
                                           newData[`${type}_${fieldDef.label}`] = typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]);
                                         }
                                       }
                                     });
                                     setSchemaData(newData);
                                     setIsSchemaBuilderOpen(true);
                                   } else {
                                     
                                     const parseObjToNodes = (obj: any, isRoot = true): SchemaNode[] => {
                                       const processValue = (k: string, v: any): SchemaNode => {
                                         if (typeof v === 'object' && v !== null) {
                                           if (Array.isArray(v)) {
                                             const children = v.map((item, idx) => processValue(String(idx), item));
                                             return { id: Math.random().toString(36).substr(2, 9), key: k, value: '', type: 'group' as const, children };
                                           } else {
                                             const children = Object.entries(v)
                                               .filter(([subK]) => subK !== '@context')
                                               .map(([subK, subV]) => processValue(subK, subV));
                                             return { id: Math.random().toString(36).substr(2, 9), key: k, value: '', type: 'group' as const, children };
                                           }
                                         }
                                         return { id: Math.random().toString(36).substr(2, 9), key: k, value: String(v), type: 'property' as const, children: [] };
                                       };
            
                                       if (isRoot && typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                                         const children = Object.entries(obj)
                                           .filter(([k]) => k !== '@context')
                                           .map(([k, v]) => processValue(k, v));
                                         return [{ id: 'root-1', key: obj['@type'] || 'Custom', value: '', type: 'group' as const, children }];
                                       }
                                       
                                       return [{ id: 'root-1', key: 'Custom', value: '', type: 'group' as const, children: Array.isArray(obj) ? obj.map((item, idx) => processValue(String(idx), item)) : [] }];
                                     };
            
                                     setCustomSchemaNodes(parseObjToNodes(data));
                                     setSelectedSchema('Custom');
                                     setIsSchemaBuilderOpen(true);
                                   }
                                 }} className="flex items-center gap-1 hover:text-[#0085ba] transition-colors"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                                 <span className="text-gray-300">|</span>
                                 <button type="button" className="flex items-center gap-1 hover:text-[#0085ba] transition-colors"><Eye className="w-3.5 h-3.5" /> Preview</button>
                                 <span className="text-gray-300">|</span>
                                 <button type="button" onClick={() => {
                                   const newSchemas = [...schemas];
                                   newSchemas.splice(i, 1);
                                   updateSchemas(newSchemas);
                                 }} className="flex items-center gap-1 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-[14px] font-semibold text-[#1d2327] mb-3">Available Schema Types</h3>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={schemaLibraryTab === 'catalog'} onChange={() => setSchemaLibraryTab('catalog')} className="text-[#0085ba] focus:ring-[#0085ba]" />
                            <span className="text-[13px] text-[#1d2327]">Schema Catalog</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={schemaLibraryTab === 'saved'} onChange={() => setSchemaLibraryTab('saved')} className="text-[#0085ba] focus:ring-[#0085ba]" />
                            <span className="text-[13px] text-[#1d2327]">Your Templates</span>
                          </label>
                        </div>
                      </div>
                      <div className="relative">
                        <input type="text" placeholder="Search..." className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-56 outline-none focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba]" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      {schemaLibraryTab === 'catalog' ? (
                        schemaTypes.map((schema) => {
                          return (
                            <div key={schema.name} className="flex items-center justify-between p-3 border border-[#e2e4e7] rounded-[3px] transition-colors hover:border-gray-300 bg-white">
                              <div className="flex items-center gap-3">
                                <schema.icon className="w-4 h-4 text-gray-400" />
                                <span className="text-[13px] text-[#50575e]">{schema.name}</span>
                                {schema.pro && <span className="bg-[#22c55e] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] ml-1">PRO</span>}
                              </div>
                              <button onClick={() => { 
                                setSelectedSchema(schema.name); 
                                setIsSchemaModalOpen(false); 
                                
                                const initialData: Record<string, string> = {};
                                if (schemaFieldDefinitions[schema.name]) {
                                  schemaFieldDefinitions[schema.name].forEach(f => {
                                    if (f.type === 'radio' && f.options && f.options.length > 0) {
                                      initialData[`${schema.name}_${f.label}`] = f.options[0];
                                    }
                                  });
                                }
                                setSchemaData(initialData);
                                
                                setIsSchemaBuilderOpen(true);
                                setEditingSchemaIndex(null);
                                setBuilderTab('edit');
                              }} className="flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-[3px] border text-gray-500 border-gray-300 hover:bg-gray-50 bg-white">
                                <PlusCircle className="w-3.5 h-3.5" /> Use
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        customTemplates.length > 0 ? (
                          customTemplates.map((template, idx) => (
                            <div key={template.id || idx} className="flex items-center justify-between p-3 border border-[#e2e4e7] rounded-[3px] transition-colors hover:border-gray-300 bg-white">
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="text-[13px] text-[#50575e]">{template.name}</span>
                              </div>
                              <button onClick={() => { 
                                let parsedSchema = typeof template.schema === 'string' ? JSON.parse(template.schema) : template.schema;
                                updateSchemas([...schemas, parsedSchema]);
                                setIsSchemaModalOpen(false);
                                toast.success('Template loaded!');
                              }} className="flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-[3px] border text-gray-500 border-gray-300 hover:bg-gray-50 bg-white">
                                <PlusCircle className="w-3.5 h-3.5" /> Use
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 py-8 text-center text-gray-500 text-[14px]">
                            No custom templates saved yet.
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
               {schemaModalTab === 'import' && (
                  <div className="h-full flex flex-col">
                    <h3 className="text-[14px] font-semibold text-[#1d2327] mb-2">Import Schema Code from</h3>
                    <p className="text-[13px] text-gray-500 mb-4">Select the source to import schema from.</p>
                    
                    <div className="space-y-4 max-w-xl">
                      <div>
                        <select 
                          value={importType} 
                          onChange={e => setImportType(e.target.value)} 
                          className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-2 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none text-[#1d2327]"
                        >
                          <option value="url">URL / Online Page</option>
                          <option value="html">HTML Code</option>
                          <option value="json">JSON-LD/Custom Code</option>
                        </select>
                      </div>
                      
                      {importType === 'url' && (
                        <div>
                          <input type="text" value={importUrl} onChange={e => setImportUrl(e.target.value)} placeholder="https://example.com/product/123" className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-2 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none" />
                        </div>
                      )}
                      
                      {importType === 'html' && (
                        <div>
                          <textarea value={importHtml} onChange={e => setImportHtml(e.target.value)} placeholder="Paste HTML containing schema here..." className="w-full h-32 border border-[#8c8f94] rounded-[3px] p-3 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none font-mono"></textarea>
                        </div>
                      )}

                      {importType === 'json' && (
                        <div>
                          <textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder="Paste JSON-LD or custom code here..." className="w-full h-32 border border-[#8c8f94] rounded-[3px] p-3 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none font-mono"></textarea>
                        </div>
                      )}

                      {importError && <div className="text-red-600 text-[13px] bg-red-50 p-3 rounded-[3px] border border-red-200">{importError}</div>}
                      <button 
                        onClick={async () => {
                          if (importType === 'url' && !importUrl) return;
                          if (importType === 'html' && !importHtml) return;
                          if (importType === 'json' && !importJson) return;
                          
                          setImportError('');
                          
                          const extractSchemas = (parsed: any): any[] => {
                            const extracted: any[] = [];
                            const seenIds = new Set<string>();
                            
                            const processNode = (node: any) => {
                              const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
                              if (types.includes('WebSite') || types.includes('ImageObject')) return;
                              if (types.length === 1 && types[0] === 'WebPage') return;
                              
                              if (node['@id']) {
                                if (seenIds.has(node['@id'])) return;
                                seenIds.add(node['@id']);
                              } else {
                                const nodeStr = JSON.stringify(node);
                                if (seenIds.has(nodeStr)) return;
                                seenIds.add(nodeStr);
                              }
                              
                              extracted.push({
                                "@context": parsed["@context"] || "https://schema.org",
                                "@graph": [node]
                              });
                            };
                          
                            if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
                              parsed['@graph'].forEach(processNode);
                            } else if (Array.isArray(parsed)) {
                              parsed.forEach(processNode);
                            } else if (parsed['@type'] && !parsed['@graph']) {
                              processNode(parsed);
                            } else {
                              extracted.push(parsed);
                            }
                            return extracted;
                          };
                          
                          if (importType === 'json') {
                            try {
                              const parsed = JSON.parse(importJson);
                              const schemasToAdd = extractSchemas(parsed);
                              const newSchemas = [...schemas, ...schemasToAdd];
                              updateSchemas(newSchemas);
                              setImportJson('');
                              setIsSchemaModalOpen(false);
                            } catch (e: any) {
                              setImportError('Invalid JSON format: ' + e.message);
                            }
                            return;
                          }
                          
                          if (importType === 'html') {
                            // Extract JSON-LD from HTML regex
                            const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
                            let match;
                            let found = false;
                            const newSchemas = [...schemas];
                            
                            while ((match = regex.exec(importHtml)) !== null) {
                              try {
                                const parsed = JSON.parse(match[1]);
                                newSchemas.push(...extractSchemas(parsed));
                                found = true;
                              } catch(e) {}
                            }
                            
                            if (found) {
                              updateSchemas(newSchemas);
                              setImportHtml('');
                              setIsSchemaModalOpen(false);
                            } else {
                              setImportError('No valid JSON-LD schema found in HTML.');
                            }
                            return;
                          }
                          
                          setIsImporting(true);
                          try {
                            const res = await fetch(`${BASE_PATH}/api/schema/import?url=${encodeURIComponent(importUrl)}`);
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Failed to import');
                            if (!data.schemas || data.schemas.length === 0) throw new Error('No valid JSON-LD schemas found on this URL.');
                            
                            const newSchemas = [...schemas];
                            data.schemas.forEach((s: any) => {
                               newSchemas.push(...extractSchemas(s));
                            });
                            updateSchemas(newSchemas);
                            setImportUrl('');
                            setIsSchemaModalOpen(false);
                          } catch (e: any) {
                            setImportError(e.message);
                          } finally {
                            setIsImporting(false);
                          }
                        }}
                        disabled={isImporting}
                        className="bg-[#0085ba] text-white px-5 py-2 rounded-[3px] text-[13px] font-medium hover:bg-[#0073aa] transition-colors disabled:opacity-50"
                      >
                        {isImporting ? 'Importing...' : 'Import'}
                      </button>
                    </div>
                  </div>
               )}
               {schemaModalTab === 'custom' && (
                  <div className="h-full flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <LayoutGrid className="w-8 h-8 text-[#0085ba]" />
                    </div>
                    <h3 className="text-[16px] font-semibold text-[#1d2327] mb-2">Advanced Schema Builder</h3>
                    <p className="text-[13px] text-gray-500 mb-6 text-center max-w-sm">Build your own custom schema markup from scratch using our advanced recursive property editor.</p>
                    <button 
                      onClick={() => {
                        setSelectedSchema('Custom');
                        setIsSchemaBuilderOpen(true);
                        setIsSchemaModalOpen(false);
                      }} 
                      className="bg-[#0085ba] text-white px-6 py-2.5 rounded-[3px] text-[13px] font-medium hover:bg-[#0073aa] transition-colors"
                    >
                      Open Advanced Editor
                    </button>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Individual Schema Builder Modal */}
      {isSchemaBuilderOpen && selectedSchema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[3px] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
             <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e4e7]">
               <h2 className="text-[16px] font-semibold text-[#1d2327]">Schema Builder</h2>
               <button type="button" onClick={() => setIsSchemaBuilderOpen(false)} className="hover:bg-gray-100 p-1 rounded transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
             </div>
             
             {/* Builder Tabs */}
             <div className="flex items-center px-6 border-b border-[#e2e4e7] bg-white relative">
               <button 
                 onClick={() => setBuilderTab('edit')} 
                 className={`py-3 px-4 text-[13px] font-medium transition-colors border-b-2 ${builderTab === 'edit' ? 'border-[#0085ba] text-[#0085ba]' : 'border-transparent text-gray-500 hover:text-[#0085ba]'}`}
               >
                 Edit
               </button>
               <button 
                 onClick={() => setBuilderTab('validation')} 
                 className={`py-3 px-4 text-[13px] font-medium transition-colors border-b-2 ${builderTab === 'validation' ? 'border-[#0085ba] text-[#0085ba]' : 'border-transparent text-gray-500 hover:text-[#0085ba]'}`}
               >
                 Code Validation
               </button>
               <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400">
                 <Info className="w-4 h-4" />
               </div>
             </div>

             <div className="flex-1 overflow-y-auto bg-[#f9f9f9] p-6 relative">
                {builderTab === 'edit' ? (
                  <>
                    {selectedSchema === 'Custom' ? (
                       <div className="bg-white border border-[#e2e4e7] rounded-[3px] p-4 overflow-x-auto">
                         <div className="min-w-max pr-4">
                           {customSchemaNodes.map(function renderNode(node, idx) {
                             return (
                             <div key={node.id} className="mb-4">
                               <div className="flex items-center gap-2">
                                 <input 
                                   type="text" 
                                   value={node.key} 
                                   onChange={(e) => setCustomSchemaNodes(nodes => updateSchemaNode(nodes, node.id, n => ({ ...n, key: e.target.value })))} 
                                   className="w-48 border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner"
                                 />
                                 {node.type !== 'group' && (
                                 <input 
                                   type="text" 
                                   value={node.value} 
                                   onChange={(e) => setCustomSchemaNodes(nodes => updateSchemaNode(nodes, node.id, n => ({ ...n, value: e.target.value })))} 
                                   className="flex-1 border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner"
                                 />
                                 )}
                                 {node.type === 'group' ? (
                                   <div className="flex items-center gap-3 ml-2">
                                     <button onClick={() => setCustomSchemaNodes(nodes => addSchemaNode(nodes, node.id, { id: Math.random().toString(36).substr(2, 9), key: '', value: '', type: 'property', children: [] }))} className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-[#0085ba]"><PlusCircle className="w-3.5 h-3.5" /> Add Property</button>
                                     <button onClick={() => setCustomSchemaNodes(nodes => addSchemaNode(nodes, node.id, { id: Math.random().toString(36).substr(2, 9), key: '', value: '', type: 'group', children: [] }))} className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-[#0085ba]"><PlusCircle className="w-3.5 h-3.5" /> Add Property Group</button>
                                     <button onClick={() => setCustomSchemaNodes(nodes => deleteSchemaNode(nodes, node.id))} className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                                   </div>
                                 ) : (
                                   <div className="flex items-center gap-2 ml-2">
                                     <button
                                      title="Copy Property"
                                      onClick={() => {
                                        const duplicateNode = (n: SchemaNode): SchemaNode => ({
                                          ...n,
                                          id: Math.random().toString(36).substring(2, 9),
                                          children: n.children.map(duplicateNode)
                                        });
                                        const newNode = duplicateNode(node);
                                        const copyNodes = (nodes: SchemaNode[]): SchemaNode[] => {
                                          const result: SchemaNode[] = [];
                                          for (const n of nodes) {
                                            result.push(n);
                                            if (n.id === node.id) result.push(newNode);
                                            else {
                                              const updated = { ...n, children: copyNodes(n.children) };
                                              result.pop();
                                              result.push(updated);
                                            }
                                          }
                                          return result;
                                        };
                                        setCustomSchemaNodes(copyNodes(customSchemaNodes));
                                      }}
                                      className="p-1.5 text-gray-400 border border-gray-300 rounded hover:text-[#0085ba] hover:border-[#0085ba]"><Copy className="w-3.5 h-3.5" /></button>
                                     <button onClick={() => setCustomSchemaNodes(nodes => deleteSchemaNode(nodes, node.id))} className="p-1.5 text-gray-400 border border-gray-300 rounded hover:text-red-600 hover:border-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                   </div>
                                 )}
                               </div>
                               {node.type === 'group' && node.children && node.children.length > 0 && (
                                 <div className="ml-8 mt-2 pl-4 border-l-2 border-gray-100">
                                   {node.children.map(child => renderNode(child, 0))}
                                 </div>
                               )}
                             </div>
                           );
                         })}
                         </div>
                       </div>
                     ) : (
                       <>
                         <div className="border border-[#e2e4e7] rounded-[3px] bg-white mb-6">
                           <div className="p-3 text-[13px] font-bold text-[#1d2327]">{selectedSchema}</div>
                         </div>
                         {(schemaFieldDefinitions[selectedSchema] || []).map((field, idx) => {
                           const fieldKey = `${selectedSchema}_${field.label}`;
                           const val = schemaData[fieldKey] || '';
                           
                           if (field.type === 'section') {
                             return (
                               <div key={idx} className="mt-6 mb-2">
                                 <span className="font-semibold text-[14px] text-[#1d2327]">{field.label}</span>
                               </div>
                             );
                           }
                           
                           if (field.type === 'info') {
                             return (
                               <div key={idx} className="border border-[#e2e4e7] rounded-[3px] bg-white mt-4">
                                 <div className="p-3 text-[11px] font-bold text-[#1d2327] border-b border-[#e2e4e7] uppercase">{field.label}</div>
                                 <div className="p-4 text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed">{field.info}</div>
                               </div>
                             );
                           }
                           
                           if (field.type === 'shortcode') {
                             return (
                               <div key={idx} className="border border-[#e2e4e7] rounded-[3px] bg-white mt-4">
                                 <div className="p-3 text-[11px] font-bold text-[#1d2327] border-b border-[#e2e4e7] uppercase">{field.label}</div>
                                 <div className="p-4">
                                   <input 
                                     type="text" 
                                     readOnly
                                     value={`[rank_math_rich_snippet id="s-${Math.random().toString(36).substring(2, 10)}"]`}
                                     className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-2 text-[13px] bg-gray-50 outline-none shadow-inner mb-2 text-gray-500" 
                                   />
                                   <div className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{field.info}</div>
                                 </div>
                               </div>
                             );
                           }
                           
                           if (field.type === 'group') {
                             let items: any[] = [];
                             try {
                               if (val && typeof val === 'string') items = JSON.parse(val);
                             } catch {}
                             
                             return (
                               <div key={idx} className="mt-8 mb-4">
                                 <div className="flex items-center justify-between mb-4">
                                   <div className="text-[14px] font-bold text-[#1d2327]">{field.label}</div>
                                   <button type="button" onClick={() => {
                                     const newItems = [...items, {}];
                                     setSchemaData({ ...schemaData, [fieldKey]: JSON.stringify(newItems) });
                                   }} className="text-[13px] text-gray-500 hover:text-[#0085ba] flex items-center gap-1">
                                     <PlusCircle className="w-4 h-4" /> Add Property Group
                                   </button>
                                 </div>
                                 <div className="space-y-6">
                                   {items.map((item: any, itemIdx: number) => (
                                      <div key={itemIdx} className="border-l-2 border-[#e2e4e7] pl-5 relative ml-2">
                                        <div className="absolute left-[-2px] top-[14px] w-[16px] h-[2px] bg-[#e2e4e7]"></div>
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="text-[13px] font-bold text-[#1d2327]">{field.itemLabel || 'Item'} {itemIdx + 1}</div>
                                          <button type="button" onClick={() => {
                                            const newItems = [...items];
                                            newItems.splice(itemIdx, 1);
                                            setSchemaData({ ...schemaData, [fieldKey]: JSON.stringify(newItems) });
                                          }} className="text-[12px] text-gray-500 hover:text-red-600 flex items-center gap-1">
                                            <Trash2 className="w-4 h-4" /> Delete
                                          </button>
                                        </div>
                                        <div className="space-y-3">
                                          {field.subFields?.map((subField, subIdx) => (
                                            <div key={subIdx} className="border border-[#e2e4e7] rounded-[3px] bg-white p-3">
                                              <div className="text-[11px] font-bold text-[#1d2327] uppercase mb-2">
                                                {subField.label}
                                              </div>
                                              <div>
                                                {subField.type === 'text' && (
                                                  <input type="text" value={item[subField.label.toLowerCase()] || ''} onChange={e => {
                                                    const newItems = [...items];
                                                    newItems[itemIdx] = { ...newItems[itemIdx], [subField.label.toLowerCase()]: e.target.value };
                                                    setSchemaData({ ...schemaData, [fieldKey]: JSON.stringify(newItems) });
                                                  }} className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner" />
                                                )}
                                                {subField.type === 'textarea' && (
                                                  <textarea value={item[subField.label.toLowerCase()] || ''} onChange={e => {
                                                    const newItems = [...items];
                                                    newItems[itemIdx] = { ...newItems[itemIdx], [subField.label.toLowerCase()]: e.target.value };
                                                    setSchemaData({ ...schemaData, [fieldKey]: JSON.stringify(newItems) });
                                                  }} className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-2 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner min-h-[80px]" />
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                   ))}
                                 </div>
                               </div>
                             );
                           }

                           return (
                             <div key={idx} className="border border-[#e2e4e7] rounded-[3px] bg-white mt-4">
                               <div className="p-3 text-[11px] font-bold text-[#1d2327] border-b border-[#e2e4e7] uppercase">
                                 {field.label.replace(/\s*\*\s*$/, '')} {field.label.includes('*') && <span className="text-red-500">*</span>}
                               </div>
                               <div className="p-4">
                                 {field.type === 'text' && (
                                   <input 
                                     type="text" 
                                     value={val}
                                     onChange={(e) => handleSchemaDataChange(field.label, e.target.value)}
                                     placeholder={field.placeholder}
                                     className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-2 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner" 
                                   />
                                 )}
                                 {field.type === 'textarea' && (
                                   <textarea 
                                     value={val}
                                     onChange={(e) => handleSchemaDataChange(field.label, e.target.value)}
                                     placeholder={field.placeholder}
                                     className="w-full h-24 border border-[#8c8f94] rounded-[3px] px-3 py-2 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner" 
                                   />
                                 )}
                                 {field.type === 'radio' && (
                                   <div className="flex items-center gap-4 flex-wrap">
                                     {field.options?.map(opt => (
                                       <label key={opt} className="flex items-center gap-1.5 text-[13px] text-gray-700 cursor-pointer">
                                         <input 
                                           type="radio" 
                                           name={fieldKey}
                                           value={opt}
                                           checked={val === opt}
                                           onChange={(e) => handleSchemaDataChange(field.label, e.target.value)}
                                           className="text-[#0085ba] focus:ring-[#0085ba]"
                                         /> {opt}
                                       </label>
                                     ))}
                                   </div>
                                 )}
                               </div>
                             </div>
                           );
                         })}
                       </>
                     )}
                  </>
                ) : (
                  <div className="bg-white p-6 rounded-[3px] border border-[#e2e4e7] h-full flex flex-col">
                    {(() => {
                      const currentSchemaObj = generateSchemaObj();
                      const currentSchemaJson = JSON.stringify(currentSchemaObj, null, 2);

                      return (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[14px] font-semibold text-[#1d2327]">JSON-LD Code</h3>
                            <div className="flex items-center gap-2">
                              <button onClick={() => { navigator.clipboard.writeText(currentSchemaJson); toast.success('Code copied!'); }} className="flex items-center gap-1 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-[3px] text-[12px] font-medium hover:bg-gray-50">
                                <FileText className="w-3.5 h-3.5" /> Copy
                              </button>
                              <button onClick={() => { 
                                // Submit code snippet via POST to Google Rich Results Test
                                const form = document.createElement('form');
                                form.method = 'POST';
                                form.action = 'https://search.google.com/test/rich-results';
                                form.target = '_blank';
                                const input = document.createElement('input');
                                input.type = 'hidden';
                                input.name = 'code_snippet';
                                input.value = currentSchemaJson;
                                form.appendChild(input);
                                document.body.appendChild(form);
                                form.submit();
                                document.body.removeChild(form);
                              }} className="flex items-center gap-1 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-[3px] text-[12px] font-medium hover:bg-gray-50">
                                <Search className="w-3.5 h-3.5" /> Test with Google
                              </button>
                            </div>
                          </div>
                          <p className="text-red-500 text-[13px] font-medium mb-4">Note: Please save the post as a draft first to see the actual data.</p>
                          <div className="flex-1 bg-[#282c34] text-[#abb2bf] font-mono text-[13px] p-4 rounded-[3px] overflow-auto">
                            <pre>{currentSchemaJson}</pre>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
             </div>
             <div className="px-6 py-4 border-t border-[#e2e4e7] bg-[#f9f9f9] flex items-center justify-between">
                <div>
                  <button type="button" className="text-[#0085ba] text-[13px] font-medium hover:underline mr-4">Advanced Editor</button>
                  <button 
                    type="button" 
                    onClick={() => {
                      const schemaObj = generateSchemaObj();
                      let templateName = selectedSchema === 'Custom' ? 'Custom Template' : selectedSchema + ' Template';
                      const name = window.prompt("Enter template name:", templateName);
                      if (name) {
                        fetch(`${BASE_PATH}/api/schema-templates`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name, schema: schemaObj })
                        })
                        .then(res => res.json())
                        .then(data => {
                          setCustomTemplates(prev => [data, ...prev]);
                          toast.success('Schema saved as custom template!');
                        })
                        .catch(() => toast.error('Failed to save template.'));
                      }
                    }}
                    className="text-[#0085ba] text-[13px] font-medium hover:underline border border-[#0085ba] px-3 py-1 rounded-[3px]"
                  >
                    Save as Template
                  </button>
                </div>
                <button 
                  onClick={() => {
                    const newSchema = generateSchemaObj();
                    const newSchemas = [...schemas];
                    if (editingSchemaIndex !== null) {
                      newSchemas[editingSchemaIndex] = newSchema;
                    } else {
                      newSchemas.push(newSchema);
                    }
                    updateSchemas(newSchemas);
                    setIsSchemaBuilderOpen(false);
                    setSelectedSchema('Article');
                    setEditingSchemaIndex(null);
                  }}
                  className="bg-[#0085ba] text-white px-5 py-2.5 rounded-[3px] text-[14px] font-semibold hover:bg-[#0073aa]"
                >
                  Save for this Post
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
