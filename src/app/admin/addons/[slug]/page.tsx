import AddonSettingsClient from '@/components/AddonSettingsClient';

export default async function AddonConfigPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  return <AddonSettingsClient slug={slug}/>;
}
