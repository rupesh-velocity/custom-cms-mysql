import Link from 'next/link';
import BodyClassInjector from '@/components/BodyClassInjector';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import NotFoundTracker from '@/components/NotFoundTracker';
import { RootHeadSettings, RootBodyScripts } from '@/components/RootSettings';

export default function NotFound() {
  return (
    <>
      <RootHeadSettings />
      <RootBodyScripts position="top" />
      <NotFoundTracker />
      <BodyClassInjector type="error404" />
      <SiteHeader />
      <main className="flex-1 w-full min-h-[50vh] flex flex-col items-center justify-center bg-white" style={{ padding: '100px 20px' }}>
        <h2>404</h2>
        <p className="text-gray-600 text-xl max-w-lg mx-auto leading-relaxed text-center" style={{ marginBottom: '40px' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-10 py-4 font-semibold rounded-xl text-white bg-[#5e3fde] hover:bg-[#4b32b2] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-lg"
        >
          Return Home
        </Link>
      </main>
      <SiteFooter />
      <RootBodyScripts position="bottom" />
    </>
  );
}
