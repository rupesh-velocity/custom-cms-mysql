'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

interface Video {
  title: string;
  url: string;
}

interface CourseViewerClientProps {
  course: {
    title: string;
    contentHtml: string | null;
    videos: any;
  }
}

export default function CourseViewerClient({ course }: CourseViewerClientProps) {
  const videos: Video[] = Array.isArray(course.videos) ? course.videos : [];
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const videoRef = useRef<HTMLDivElement | null>(null);

  const activeVideo = videos[activeVideoIndex];

  const handleLessonChange = (index: number, shouldScroll = false) => {
    setActiveVideoIndex(index);

    if (shouldScroll) {
      window.setTimeout(() => {
        videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  return (
    <main className="course-portal-dashboard flex-1 w-full bg-[#f6f8fb] pb-16">
      {/* Customer portal course heading. Public course hero is intentionally hidden for purchased users. */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 lg:pt-10">
        <div className="rounded-[28px] border border-[#e6e9f0] bg-white px-6 py-6 shadow-[0_18px_45px_rgba(22,26,41,0.06)] sm:px-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <div className="mb-3 inline-flex rounded-full bg-[#5e3fde]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#5e3fde]">
              Course Portal
            </div>
            <h1 className="course-portal-title">
              {course.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#546179]">
              Continue your course from the lesson area below. Your access is active for this course.
            </p>
          </div>

          <div className="mt-5 grid w-full grid-cols-2 gap-3 lg:mt-0 lg:flex lg:w-auto lg:flex-wrap lg:items-center lg:justify-end">
            <span className="inline-flex w-full items-center justify-center rounded-full border border-green-200 bg-green-50 px-3 py-2 text-center text-xs font-bold text-green-700 sm:text-sm lg:w-auto lg:px-4">
              Access Active
            </span>
            <Link
              href="/my-account?tab=courses"
              className="inline-flex w-full items-center justify-center rounded-xl border border-[#d7dcef] bg-white px-3 py-2 text-center text-xs font-bold text-[#161A29] transition hover:border-[#5e3fde] hover:text-[#5e3fde] sm:text-sm lg:w-auto lg:px-5 lg:py-3"
            >
              Back to My Courses
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        {/* Mobile lesson selector. Desktop curriculum sidebar stays unchanged. */}
        <div className="order-1 min-w-0 lg:hidden">
          <div className="rounded-3xl border border-[#e6e9f0] bg-white p-5 shadow-[0_18px_45px_rgba(22,26,41,0.06)]">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#161A29]">Choose Your Lesson</h2>
              <p className="mt-1 text-sm leading-6 text-[#667085]">
                Select a lesson below. The video will open under this box.
              </p>
            </div>

            {videos.length === 0 ? (
              <div className="rounded-2xl bg-[#f6f8fb] p-4 text-sm italic text-gray-500">No videos added yet.</div>
            ) : (
              <div className="space-y-3">
                <label htmlFor="mobile-lesson-select" className="block text-xs font-bold uppercase tracking-[0.12em] text-[#8a94a6]">
                  Selected Lesson
                </label>
                <select
                  id="mobile-lesson-select"
                  value={activeVideoIndex}
                  onChange={(event) => handleLessonChange(Number(event.target.value), true)}
                  className="w-full rounded-2xl border border-[#d7dcef] bg-[#f6f8fb] px-4 py-4 text-base font-bold text-[#161A29] outline-none transition focus:border-[#5e3fde] focus:ring-4 focus:ring-[#5e3fde]/10"
                >
                  {videos.map((video, index) => (
                    <option key={index} value={index}>
                      {index + 1}. {video.title || `Lesson ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Video */}
        <div ref={videoRef} className="order-2 min-w-0 scroll-mt-24 lg:order-1 lg:col-start-1">
          <div className="relative aspect-video overflow-hidden rounded-3xl border border-[#e6e9f0] bg-black shadow-[0_18px_45px_rgba(22,26,41,0.12)]">
            {activeVideo && activeVideo.url ? (
              <iframe
                src={activeVideo.url}
                className="h-full w-full pointer-events-auto"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                No video available.
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]" />
          </div>
        </div>

        {/* Course Curriculum */}
        <aside className="hidden w-full lg:sticky lg:top-24 lg:order-2 lg:col-start-2 lg:row-span-2 lg:block">
          <div className="rounded-3xl border border-[#e6e9f0] bg-white p-6 shadow-[0_18px_45px_rgba(22,26,41,0.06)]">
            <div className="mb-5">
              <h3 className="text-xl font-bold text-[#161A29]">Course Curriculum</h3>
              <p className="mt-1 text-sm text-[#667085]">Select a lesson to continue.</p>
            </div>

            <div className="max-h-[500px] space-y-3 overflow-y-auto pr-2">
              {videos.length === 0 && (
                <div className="rounded-2xl bg-[#f6f8fb] p-4 text-sm italic text-gray-500">No videos added yet.</div>
              )}

              {videos.map((video, index) => {
                const isActive = index === activeVideoIndex;
                return (
                  <button
                    key={index}
                    onClick={() => handleLessonChange(index)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
                      isActive
                        ? 'border-[#5e3fde]/25 bg-[#5e3fde]/10 shadow-sm'
                        : 'border-transparent bg-[#f6f8fb] hover:border-[#d7dcef] hover:bg-white'
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isActive ? 'bg-[#5e3fde] text-white' : 'bg-white text-[#667085]'
                    }`}>
                      {index + 1}
                    </span>
                    <span className={`pt-1.5 text-sm font-bold ${isActive ? 'text-[#5e3fde]' : 'text-[#344054]'}`}>
                      {video.title || `Lesson ${index + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* About This Course */}
        <div className="order-4 min-w-0 lg:order-3 lg:col-start-1">
          <div className="rounded-3xl border border-[#e6e9f0] bg-white p-6 shadow-[0_18px_45px_rgba(22,26,41,0.06)] sm:p-8 lg:p-10">
            <h2 className="mb-5 text-2xl font-bold text-[#161A29]">About this Course</h2>
            <div
              className="prose prose-purple max-w-none leading-relaxed text-gray-600"
              dangerouslySetInnerHTML={{ __html: course.contentHtml || '' }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
