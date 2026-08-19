'use client';

import Link from 'next/link';
import PageHeroBanner from '@/components/PageHeroBanner';

interface CourseLandingClientProps {
  course: {
    id: number;
    title: string;
    contentHtml: string | null;
    featuredImage: string | null;
    price?: number | null;
    salePrice?: number | null;
  }
}

export default function CourseLandingClient({ course }: CourseLandingClientProps) {
  return (
    <div className="min-h-screen bg-gray-50 w-full font-sans pb-16">
      
      {/* Hero Banner */}
      <PageHeroBanner 
        title={course.title}
        image={course.featuredImage}
        description={
          <div className="flex flex-col items-center justify-center gap-6 mt-4">
            
            
            {course.price !== null && course.price !== undefined && course.price > 0 && (
              <div className="flex items-baseline gap-3 justify-center">
                <span className="text-4xl font-bold text-white">
                  ${course.salePrice ? course.salePrice.toFixed(2) : course.price.toFixed(2)}
                </span>
                {course.salePrice && (
                  <span className="text-xl text-white/60 line-through">
                    ${course.price.toFixed(2)}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-2">
              <Link 
                href={`/checkout?type=course&id=${course.id}`}
                className="bg-[#5e3fde] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#4b32b2] hover:scale-105 transition-all shadow-lg shadow-[#5e3fde]/30 text-center"
              >
                Enroll Now
              </Link>
              <a 
                href="#curriculum"
                className="bg-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all text-center backdrop-blur-sm border border-white/10"
              >
                View Curriculum
              </a>
            </div>
           
          </div>
        }
      />

      {/* Course Content */}
      <div id="curriculum" className="max-w-4xl mx-auto px-6 mt-12 relative z-20 pb-16">
        <div className="section-about-course rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 lg:p-16 ">
          <h2 className="">About This Course</h2>
          
          {course.contentHtml ? (
            <div 
              className="prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: course.contentHtml }}
            />
          ) : (
            <p className="text-gray-500 italic text-lg">Detailed course description coming soon...</p>
          )}

          <div className="section-ready-get-started !mt-16 pt-10 border-t border-gray-100 text-center">
            <h3 className="text-2xl font-bold text-gray-900 !mb-4">Ready to get started?</h3>
            <p className="text-gray-600">Join today and get immediate access to all the course materials.</p>
            <Link 
              href={`/checkout?type=course&id=${course.id}`}
              className="inline-block bg-[#5e3fde] text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-[#4b32b2] hover:shadow-lg transition-all"
            >
              Enroll Now to Unlock Access
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
