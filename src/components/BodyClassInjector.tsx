'use client';
import { useEffect, useRef } from 'react';
import { BASE_PATH } from '@/lib/config';

export default function BodyClassInjector({ type, id }: { type: string, id?: string | number }) {
  const prevClassesRef = useRef<string[]>([]);

  useEffect(() => {
    const classesToAdd = [];

    if (type === 'page') {
      classesToAdd.push('single-page');
      if (id) classesToAdd.push(`page-id-${id}`);
    } else if (type === 'post') {
      classesToAdd.push('single-post');
      if (id) classesToAdd.push(`post-id-${id}`);
    } else if (type === 'category') {
      classesToAdd.push('archive', 'category');
      if (id) classesToAdd.push(`category-id-${id}`);
    } else if (type === 'tag') {
      classesToAdd.push('archive', 'tag');
      if (id) classesToAdd.push(`tag-id-${id}`);
    } else if (type === 'search') {
      classesToAdd.push('search', 'search-results');
    } else if (type === 'error404') {
      classesToAdd.push('error404');
    } else if (type === 'blog') {
      classesToAdd.push('blog');
    }

    if (window.location.pathname === '/' || window.location.pathname === BASE_PATH || window.location.pathname === BASE_PATH + '/') {
      classesToAdd.push('home');
    }

    const finalClasses = classesToAdd.filter(Boolean);

    if (prevClassesRef.current.length > 0) {
      document.body.classList.remove(...prevClassesRef.current);
    }

    document.body.classList.add(...finalClasses);
    prevClassesRef.current = finalClasses;

    return () => {
      document.body.classList.remove(...finalClasses);
    };
  }, [type, id]);

  return null;
}
