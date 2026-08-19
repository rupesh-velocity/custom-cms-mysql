import { redirect } from 'next/navigation';

export default async function CourseIdRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  redirect(`/admin/courses/${resolvedParams?.id}/edit`);
}
