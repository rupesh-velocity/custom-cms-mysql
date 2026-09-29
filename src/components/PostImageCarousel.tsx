'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PublicPostCarouselImage = {
  id: number;
  src: string;
  alt: string;
  caption?: string | null;
  srcSet?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
};

type Props = {
  images: PublicPostCarouselImage[];
  heading?: string | null;
  slidesPerView?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pagination?: boolean;
};

const GAP = 16;
const TRANSITION_MS = 450;
const SWIPE_THRESHOLD = 40;

function clampSlides(value: number | undefined) {
  const parsed = Number(value || 3);
  if (parsed <= 1) return 1;
  if (parsed === 2) return 2;
  return 3;
}

function clampDelay(value: number | undefined) {
  const parsed = Number(value || 3000);
  if (!Number.isFinite(parsed)) return 3000;
  return Math.max(1500, Math.min(15000, Math.round(parsed)));
}

export default function PostImageCarousel({
  images,
  heading,
  slidesPerView = 3,
  autoplay = true,
  autoplayDelay = 3000,
  pagination = true,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const transitioningRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [responsiveSlides, setResponsiveSlides] = useState(1);
  const [trackIndex, setTrackIndex] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const configuredSlides = clampSlides(slidesPerView);
  const delay = clampDelay(autoplayDelay);
  const imageCount = images.length;
  const visibleSlides = Math.max(1, Math.min(responsiveSlides, imageCount || 1));
  const slideWidth = viewportWidth > 0
    ? Math.max(0, (viewportWidth - GAP * (visibleSlides - 1)) / visibleSlides)
    : 0;

  // Three full copies keep valid slides available on both sides of the viewport.
  // We start in the middle copy, then silently jump back to the middle after each
  // full loop. This prevents the track from ever translating into empty space.
  const renderedImages = useMemo(() => {
    if (imageCount <= 1) {
      return images.map((image, renderIndex) => ({ image, renderIndex, copyIndex: 1 }));
    }

    return [0, 1, 2].flatMap((copyIndex) =>
      images.map((image, imageIndex) => ({
        image,
        renderIndex: copyIndex * imageCount + imageIndex,
        copyIndex,
      })),
    );
  }, [images, imageCount]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener?.('change', updateMotion);
    return () => media.removeEventListener?.('change', updateMotion);
  }, []);

  useEffect(() => {
    const updateSize = () => {
      const width = viewportRef.current?.clientWidth || 0;
      setViewportWidth(width);

      const screenWidth = window.innerWidth;
      const nextSlides = screenWidth < 640
        ? 1
        : screenWidth < 1024
          ? Math.min(2, configuredSlides)
          : configuredSlides;
      setResponsiveSlides(nextSlides);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateSize)
      : null;
    if (viewportRef.current && observer) observer.observe(viewportRef.current);

    return () => {
      window.removeEventListener('resize', updateSize);
      observer?.disconnect();
    };
  }, [configuredSlides]);

  useEffect(() => {
    transitioningRef.current = false;
    setTransitionEnabled(false);
    setTrackIndex(imageCount > 1 ? imageCount : 0);

    const frame = requestAnimationFrame(() => setTransitionEnabled(true));
    return () => cancelAnimationFrame(frame);
  }, [visibleSlides, imageCount]);

  const jumpWithoutAnimation = useCallback((nextIndex: number) => {
    transitioningRef.current = false;
    setTransitionEnabled(false);
    setTrackIndex(nextIndex);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionEnabled(true));
    });
  }, []);

  const goNext = useCallback(() => {
    if (imageCount <= 1) return;

    if (reducedMotion) {
      setTrackIndex((current) => {
        const next = current + 1;
        return next >= imageCount * 2 ? next - imageCount : next;
      });
      return;
    }

    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setTransitionEnabled(true);
    setTrackIndex((current) => current + 1);
  }, [imageCount, reducedMotion]);

  const goPrevious = useCallback(() => {
    if (imageCount <= 1) return;

    if (reducedMotion) {
      setTrackIndex((current) => {
        const next = current - 1;
        return next < imageCount ? next + imageCount : next;
      });
      return;
    }

    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setTransitionEnabled(true);
    setTrackIndex((current) => current - 1);
  }, [imageCount, reducedMotion]);

  const goToSlide = useCallback((targetIndex: number) => {
    if (imageCount <= 1) return;

    const normalizedTarget = ((targetIndex % imageCount) + imageCount) % imageCount;
    const candidates = [
      normalizedTarget,
      normalizedTarget + imageCount,
      normalizedTarget + imageCount * 2,
    ];
    const nextTrackIndex = candidates.reduce((closest, candidate) =>
      Math.abs(candidate - trackIndex) < Math.abs(closest - trackIndex) ? candidate : closest,
    candidates[0]);

    if (nextTrackIndex === trackIndex) return;

    if (reducedMotion) {
      setTransitionEnabled(false);
      setTrackIndex(nextTrackIndex);
      requestAnimationFrame(() => setTransitionEnabled(true));
      return;
    }

    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setTransitionEnabled(true);
    setTrackIndex(nextTrackIndex);
  }, [imageCount, reducedMotion, trackIndex]);

  useEffect(() => {
    if (!autoplay || paused || reducedMotion || imageCount <= 1) return;
    const timer = window.setInterval(goNext, delay);
    return () => window.clearInterval(timer);
  }, [autoplay, paused, reducedMotion, imageCount, delay, goNext]);

  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    // Ignore transition events bubbling from child images (their hover zoom also
    // uses transform). We only care about the carousel track transform itself.
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;

    transitioningRef.current = false;

    if (imageCount <= 1) return;

    if (trackIndex >= imageCount * 2) {
      jumpWithoutAnimation(trackIndex - imageCount);
      return;
    }

    if (trackIndex < imageCount) {
      jumpWithoutAnimation(trackIndex + imageCount);
    }
  };

  if (!images.length) return null;

  const normalizedHeading = typeof heading === 'string' ? heading.trim() : '';
  const activeIndex = imageCount > 0 ? ((trackIndex % imageCount) + imageCount) % imageCount : 0;
  const offset = slideWidth > 0 ? trackIndex * (slideWidth + GAP) : 0;
  const slideBasis = `calc((100% - ${GAP * (visibleSlides - 1)}px) / ${visibleSlides})`;

  return (
    <section
      className="relative mt-12 post-image-carousel"
      aria-label={normalizedHeading || 'Post image carousel'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {normalizedHeading && (
        <h2>
          {normalizedHeading}
        </h2>
      )}

      <div
        ref={viewportRef}
        className="relative overflow-hidden rounded-2xl touch-pan-y"
        onTouchStart={(event) => {
          touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartXRef.current;
          const endX = event.changedTouches[0]?.clientX;
          touchStartXRef.current = null;
          if (startX == null || endX == null) return;

          const distance = endX - startX;
          if (distance <= -SWIPE_THRESHOLD) goNext();
          if (distance >= SWIPE_THRESHOLD) goPrevious();
        }}
      >
        <div
          className="flex"
          style={{
            gap: `${GAP}px`,
            transform: `translate3d(-${offset}px, 0, 0)`,
            transition: transitionEnabled && !reducedMotion
              ? `transform ${TRANSITION_MS}ms ease`
              : 'none',
            willChange: imageCount > 1 ? 'transform' : undefined,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {renderedImages.map(({ image, renderIndex, copyIndex }) => (
            <figure
              key={`${copyIndex}-${image.id}-${renderIndex}`}
              className="shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm"
              style={{ flexBasis: slideBasis, width: slideBasis }}
              aria-hidden={copyIndex !== 1 ? true : undefined}
            >
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                  src={image.src}
                  alt={copyIndex === 1 ? image.alt : ''}
                  srcSet={image.srcSet || undefined}
                  sizes={image.sizes || undefined}
                  loading={image.loading}
                  fetchPriority={image.fetchPriority}
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
              </div>
              {image.caption && (
                <figcaption className="px-4 py-3 text-sm leading-relaxed text-gray-600">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>

        {imageCount > 1 && (
          <>
            <button
              type="button"
              onClick={goPrevious}
              className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md transition hover:bg-[#5e3fde] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#5e3fde] focus:ring-offset-2"
              aria-label="Previous carousel image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md transition hover:bg-[#5e3fde] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#5e3fde] focus:ring-offset-2"
              aria-label="Next carousel image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {pagination && imageCount > 1 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Carousel pagination">
          {images.map((image, dotIndex) => {
            const active = dotIndex === activeIndex;
            return (
              <button
                key={`carousel-dot-${image.id}-${dotIndex}`}
                type="button"
                onClick={() => goToSlide(dotIndex)}
                aria-label={`Go to carousel image ${dotIndex + 1} of ${imageCount}`}
                aria-current={active ? 'true' : undefined}
                className={`h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#5e3fde] focus:ring-offset-2 ${
                  active
                    ? 'w-7 bg-[#5e3fde]'
                    : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            );
          })}
        </div>
      )}

      {autoplay && imageCount > 1 && (
        <span className="sr-only" aria-live="polite">
          Carousel rotates automatically every {Math.round(delay / 100) / 10} seconds and pauses while hovered or focused.
        </span>
      )}
    </section>
  );
}
