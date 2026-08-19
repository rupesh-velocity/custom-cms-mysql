import FormEditor from '@/components/FormEditor';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const form = await prisma.form.findUnique({
    where: { id: parseInt(resolvedParams?.id) }
  });

  if (!form) return notFound();

  return <FormEditor form={form} />;
}
