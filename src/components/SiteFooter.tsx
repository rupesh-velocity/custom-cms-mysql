import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface SocialIcon {
  id: string;
  iconUrl: string;
  link: string;
}

export default async function SiteFooter() {
  // Fetch settings for branding and social icons
  const settingsRecords = await prisma.setting.findMany({
    where: {
      key: { in: ['site_title', 'site_tagline', 'footer_logo', 'social_icons', 'copyright_text'] }
    }
  });
  
  const settings = settingsRecords.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  const footerLogo = settings.footer_logo || 'assets/images/Fitness Arts Logo 2.png';
  const siteTagline = settings.site_tagline || 'Yoga, Pilates, Dance and other Creative Movement!';

  const optimizeImageUrl = (url: string) => {
    if (!url) return url;
    return url.replace(
      /https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(v[0-9]+\/.+)/i,
      'https://res.cloudinary.com/$1/image/upload/f_auto,q_auto,w_auto/$2'
    );
  };
  
  let socialIcons: SocialIcon[] = [];
  try {
    if (settings.social_icons) {
      socialIcons = JSON.parse(settings.social_icons);
    }
  } catch (e) {
    console.error('Failed to parse social icons');
  }

  // Fetch footer menus
  const footerLinksMenu = await prisma.menu.findUnique({
    where: { slug: 'footer-links' },
    include: { items: { orderBy: { order: 'asc' } } }
  });
  
  const footerServicesMenu = await prisma.menu.findFirst({
    where: { slug: { in: ['footer-services', 'footer-service'] } },
    include: { items: { orderBy: { order: 'asc' } } }
  });

  // Default placeholders if menus don't exist
  const defaultLinks = [
    { id: '1', label: 'Home', url: '/' },
    { id: '2', label: 'Contact Us', url: '/contact' },
    { id: '3', label: 'About Us', url: '/about' },
    { id: '4', label: 'Log Out', url: '/logout' },
  ];
  
  const defaultServices = [
    { id: '1', label: 'On Demand', url: '/on-demand' },
    { id: '2', label: 'On Premise', url: '/on-premise' },
    { id: '3', label: 'Teacher Training', url: '/training' },
    { id: '4', label: 'Puppet Arts', url: '/puppet-arts' },
    { id: '5', label: 'Events', url: '/events' },
  ];

  const links = footerLinksMenu?.items?.length ? footerLinksMenu.items : defaultLinks;
  const services = footerServicesMenu?.items?.length ? footerServicesMenu.items : defaultServices;

  return (
    <footer className="site-footer bg-dark">
      <div className="container">
        <div className="footer-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="footer-brand-col lg:col-span-3">
            <img src={optimizeImageUrl(footerLogo)} alt="Fitness Arts" className="footer-logo" loading="lazy" />
            <p className="footer-text">{siteTagline}</p>
            <div className="footer-social flex gap-5">
              {socialIcons.length > 0 ? (
                socialIcons.map((icon) => (
                  <a key={icon.id} href={icon.link || '#'} className="social-icon" target="_blank" rel="noopener noreferrer">
                    {icon.iconUrl && <img src={optimizeImageUrl(icon.iconUrl)} alt="Social Icon" loading="lazy" />}
                  </a>
                ))
              ) : (
                <>
                  {/* Default Social Icons */}
                  <a href="#" className="social-icon"><img src="assets/images/Frame 162.png" alt="LinkedIn" /></a>
                  <a href="#" className="social-icon"><img src="assets/images/Frame 163.png" alt="YouTube" /></a>
                  <a href="#" className="social-icon"><img src="assets/images/Frame 164.png" alt="X" /></a>
                  <a href="#" className="social-icon"><img src="assets/images/Frame 165.png" alt="Facebook" /></a>
                </>
              )}
            </div>
          </div>
          <div className="footer-links-col lg:col-span-2">
            <h3 className="footer-heading">Links</h3>
            <ul className="footer-list">
              {links.map(link => (
                <li key={link.id}><Link href={link.url}>{link.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer-services-col lg:col-span-2">
            <h3 className="footer-heading">Services</h3>
            <ul className="footer-list">
              {services.map(service => (
                <li key={service.id}><Link href={service.url}>{service.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer-cta-col lg:col-span-4 lg:col-start-9">
            <h2 className="footer-title">Your Best Move <span className="txt-accent">Starts Now</span></h2>
            <p className="footer-text footer-cta-text">Start with a Free Class and Discover how good Movement can Feel</p>
            <a href="https://fitnessarts.com/on-demand/" className="theme-btn theme-btn-blue">Start Your Free Class Now</a>
          </div>
        </div>
        <div className="footer-line"></div>
        <p 
          className="copyright" 
          dangerouslySetInnerHTML={{ 
            __html: settings.copyright_text
              ? settings.copyright_text.replace('%year%', new Date().getFullYear().toString())
              : `© ${new Date().getFullYear()} ${settings.site_title || 'Your Company Name'} | All rights reserved. | Website by <a href="https://velocityconsultancy.com/" target="_blank" rel="noopener noreferrer">Velocity Consultancy</a>`
          }} 
        />
      </div>
    </footer>
  );
}
