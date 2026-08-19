import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import FormNav from '@/components/FormNav';
import FormSettingsEditor from '@/components/FormSettingsEditor';

export default async function SettingsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const form = await prisma.form.findUnique({
    where: { id: parseInt(params?.id) }
  });

  if (!form) return notFound();

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Form Settings: {form.title}</h1>
      </div>
      
      <FormNav formId={form.id} title={form.title} />

      <FormSettingsEditor form={form} />
    </div>
  );
}
