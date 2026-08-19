import type { Metadata } from "next";
import "./globals.css";
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Custom CMS',
  description: 'Custom CMS',
};

export const dynamic = 'force-dynamic';
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let fontFamilies: { name: string, variations: { weight: string, style: string, woff2Url: string }[] }[] = [];
  
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'custom_fonts' }
    });
    
    if (setting && setting.value) {
      fontFamilies = JSON.parse(setting.value);
    }
  } catch (e) {
    // Ignore db connection issues during build
  }

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {fontFamilies.length > 0 ? (
          <style dangerouslySetInnerHTML={{
            __html: `
              ${fontFamilies.map(family => 
                family.variations.map(v => `
                  @font-face {
                    font-family: '${family.name}';
                    src: url('${v.woff2Url}') format('woff2');
                    font-weight: ${v.weight};
                    font-style: ${v.style};
                    font-display: swap;
                  }
                `).join('\n')
              ).join('\n')}
            `
          }} />
        ) : null}
        {children}
      </body>
    </html>
  );
}
