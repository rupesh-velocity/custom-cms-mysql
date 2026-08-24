'use client';
import { useState } from 'react';
import PageHeroBanner from '@/components/PageHeroBanner';

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

  const activeVideo = videos[activeVideoIndex];

  return (
    <main className="flex-1 w-full flex flex-col bg-gray-50 pb-24">
      {/* Hero Banner */}
      <PageHeroBanner
        title={course.title}
        description={
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#5e3fde]/20 text-[#a5b4fc] font-bold text-sm mt-4 border border-[#5e3fde]/30 uppercase tracking-widest w-max">
            My Course
          </div>
        }
      />

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 mt-12 relative z-20 flex flex-col lg:flex-row gap-8">
        {/* Left Col - Video & Description */}
        <div className="flex-1 min-w-0">
        
        <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video mb-8 border border-gray-200 relative group">
          {activeVideo && activeVideo.url ? (
            <iframe 
              src={activeVideo.url} 
              className="w-full h-full pointer-events-auto"
              allow="autoplay; fullscreen; picture-in-picture" 
              allowFullScreen
              // Prevent right click on video container
              onContextMenu={(e) => e.preventDefault()}
            ></iframe>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No video available.
            </div>
          )}
          {/* Invisible overlay over edges */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] rounded-xl"></div>
        </div>

        <div className="section-about-course rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 lg:p-16">
          <h2 className="">About this Course</h2>
          <div 
            className="prose prose-purple max-w-none text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: course.contentHtml || '' }}
          />
        </div>
      </div>

      {/* Right Col - Sidebar Playlist */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
          <h3 className="font-bold text-gray-900 !mb-4">Course Curriculum</h3>
          
          <div className="space-y-3 !mb-6 max-h-[500px] overflow-y-auto pr-2">
            {videos.length === 0 && (
              <div className="text-sm text-gray-500 italic">No videos added yet.</div>
            )}
            
            {videos.map((video, index) => {
              const isActive = index === activeVideoIndex;
              return (
                <button
                  key={index}
                  onClick={() => setActiveVideoIndex(index)}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    isActive 
                      ? 'bg-[#5e3fde]/10 border-[#5e3fde]/20 shadow-sm' 
                      : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isActive ? 'bg-[#5e3fde] text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className={`font-semibold text-sm pt-1.5 ${isActive ? 'text-[#5e3fde]' : 'text-gray-700'}`}>
                    {video.title || `Lesson ${index + 1}`}
                  </div>
                </button>
              );
            })}
          </div>

          <button className="w-full bg-[#5e3fde] text-white py-3 rounded-lg font-medium hover:bg-[#4b32b2] transition-all transform hover:scale-[1.02] shadow-md shadow-[#5e3fde]/20">
            Mark Course Complete
          </button>
        </div>
      </div>
    </div>
    </main>
  );
}
