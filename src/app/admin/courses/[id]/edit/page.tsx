'use client';
import { use } from 'react';
import CourseEditorForm from '@/components/CourseEditorForm';
export default function EditCourse({params}:{params:Promise<{id:string}>}){ const {id}=use(params); return <CourseEditorForm courseId={id}/>; }
