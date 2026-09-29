'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ImagePlus, Images, Loader2, Search, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

export type PostCarouselEditorImage = {
  mediaId: number;
  url: string;
  filename: string;
  altText?: string | null;
  caption?: string | null;
};

type MediaItem = {
  id: number;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  altText?: string | null;
  createdAt: string;
};

export type PostCarouselEditorSettings = {
  heading: string;
  slidesPerView: 1 | 2 | 3;
  autoplay: boolean;
  autoplayDelay: number;
  pagination: boolean;
};

type Props = {
  images: PostCarouselEditorImage[];
  onChange: (images: PostCarouselEditorImage[]) => void;
  settings: PostCarouselEditorSettings;
  onSettingsChange: (settings: PostCarouselEditorSettings) => void;
};

function SortableCarouselImage({
  image,
  onRemove,
  onCaptionChange,
}: {
  image: PostCarouselEditorImage;
  onRemove: () => void;
  onCaptionChange: (caption: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.mediaId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow ${
        isDragging ? 'border-[#5e3fde] shadow-lg' : 'border-gray-200'
      }`}
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        <img
          src={image.url}
          alt={image.altText || image.filename}
          className="h-full w-full object-cover"
        />

        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute left-2 top-2 flex h-9 w-9 cursor-grab items-center justify-center rounded-lg bg-white/95 text-gray-600 shadow hover:text-[#5e3fde] active:cursor-grabbing"
          aria-label={`Reorder ${image.filename}`}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-gray-500 shadow hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove ${image.filename}`}
          title="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <div className="truncate text-xs font-medium text-gray-700" title={image.filename}>
          {image.filename}
        </div>
        <input
          type="text"
          value={image.caption || ''}
          onChange={(event) => onCaptionChange(event.target.value)}
          placeholder="Optional caption"
          maxLength={2000}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 outline-none transition focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde]"
        />
      </div>
    </div>
  );
}

function CarouselMediaPicker({
  isOpen,
  currentImages,
  onClose,
  onApply,
}: {
  isOpen: boolean;
  currentImages: PostCarouselEditorImage[];
  onClose: () => void;
  onApply: (images: PostCarouselEditorImage[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_PATH}/api/media?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (!response.ok) throw new Error(`Media request failed with ${response.status}`);
      const data = await response.json();
      setMedia(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load media library:', error);
      toast.error('Could not load the media library.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('library');
    setQuery('');
    setSelectedIds(currentImages.map((image) => image.mediaId));
    fetchMedia();
  }, [isOpen, currentImages, fetchMedia]);

  const imageMedia = useMemo(
    () => media.filter((item) => item.mimeType?.startsWith('image/')),
    [media],
  );

  const filteredMedia = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return imageMedia;
    return imageMedia.filter((item) =>
      `${item.filename} ${item.altText || ''}`.toLowerCase().includes(term),
    );
  }, [imageMedia, query]);

  const toggleMedia = (id: number) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 50) {
        toast.error('A carousel can contain up to 50 images.');
        return current;
      }
      return [...current, id];
    });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) {
      toast.error('Please select image files.');
      return;
    }

    setIsUploading(true);
    const uploaded: MediaItem[] = [];

    try {
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch(`${BASE_PATH}/api/upload`, {
            method: 'POST',
            body: formData,
          });
          const result = await response.json().catch(() => null);

          if (!response.ok || !result?.id) {
            toast.error(result?.error || `Failed to upload ${file.name}`);
            continue;
          }

          uploaded.push(result as MediaItem);
          toast.success(`${file.name} uploaded`);
        } catch (error) {
          console.error('Carousel image upload failed:', error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (uploaded.length) {
        setMedia((current) => [
          ...uploaded,
          ...current.filter((item) => !uploaded.some((newItem) => newItem.id === item.id)),
        ]);
        setSelectedIds((current) => {
          const additions = uploaded.map((item) => item.id).filter((id) => !current.includes(id));
          return [...current, ...additions].slice(0, 50);
        });
        setActiveTab('library');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const applySelection = () => {
    const currentById = new Map(currentImages.map((image) => [image.mediaId, image]));
    const mediaById = new Map(media.map((item) => [item.id, item]));

    const selected = selectedIds.slice(0, 50).flatMap((mediaId) => {
      const existing = currentById.get(mediaId);
      if (existing) return [existing];

      const item = mediaById.get(mediaId);
      if (!item) return [];

      return [{
        mediaId: item.id,
        url: item.url,
        filename: item.filename,
        altText: item.altText || null,
        caption: null,
      } satisfies PostCarouselEditorImage];
    });

    onApply(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 sm:p-8">
      <div className="flex h-full max-h-[820px] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Select carousel images</h2>
            <p className="mt-1 text-sm text-gray-500">Choose multiple images from the existing media library.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close media picker">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'library' ? 'border-[#5e3fde] text-[#5e3fde]' : 'border-transparent text-gray-600'}`}
          >
            Media Library
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`border-b-2 px-4 py-3 text-sm font-medium ${activeTab === 'upload' ? 'border-[#5e3fde] text-[#5e3fde]' : 'border-transparent text-gray-600'}`}
          >
            Upload Images
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'library' ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search images..."
                    className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde]"
                  />
                </div>
                <div className="shrink-0 text-sm font-medium text-gray-600">
                  {selectedIds.length} selected
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="flex h-full min-h-52 items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading images...
                  </div>
                ) : filteredMedia.length === 0 ? (
                  <div className="flex min-h-52 flex-col items-center justify-center text-center text-gray-500">
                    <Images className="mb-3 h-10 w-10 text-gray-300" />
                    <p>No matching images found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
                    {filteredMedia.map((item) => {
                      const selectedIndex = selectedIds.indexOf(item.id);
                      const selected = selectedIndex >= 0;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => toggleMedia(item.id)}
                          className={`group relative aspect-square overflow-hidden rounded-lg border-4 bg-gray-100 text-left ${selected ? 'border-[#5e3fde]' : 'border-transparent hover:border-gray-300'}`}
                          title={item.filename}
                        >
                          <img src={item.url} alt={item.altText || item.filename} className="h-full w-full object-cover" />
                          {selected && (
                            <span className="absolute right-1 top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#5e3fde] px-2 text-xs font-bold text-white shadow">
                              {selectedIndex + 1}
                            </span>
                          )}
                          <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {item.filename}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div
                className={`w-full max-w-2xl rounded-xl border-2 border-dashed p-12 text-center transition-colors ${dragActive ? 'border-[#5e3fde] bg-[#5e3fde]/5' : 'border-gray-300 bg-gray-50'}`}
                onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
                onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  handleUpload(event.dataTransfer.files);
                }}
              >
                <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">Drop images to upload</h3>
                <p className="mt-2 text-sm text-gray-500">Uploaded images are added to the Media Library and selected for this carousel.</p>
                <div className="relative mt-6 inline-block">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(event) => handleUpload(event.target.files)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span className="inline-flex items-center gap-2 rounded-lg bg-[#5e3fde] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4b32b2]">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isUploading ? 'Uploading...' : 'Select Images'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="text-sm text-gray-500">Selection order becomes the initial carousel order. You can drag to reorder afterward.</p>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={applySelection} className="rounded-lg bg-[#5e3fde] px-5 py-2 text-sm font-medium text-white hover:bg-[#4b32b2]">
              Use {selectedIds.length} {selectedIds.length === 1 ? 'image' : 'images'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PostImageCarouselEditor({
  images,
  onChange,
  settings,
  onSettingsChange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((image) => image.mediaId === active.id);
    const newIndex = images.findIndex((image) => image.mediaId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onChange(arrayMove(images, oldIndex, newIndex));
  };

  const updateSettings = (partial: Partial<PostCarouselEditorSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Images className="h-5 w-5 text-[#5e3fde]" />
              <h2 className="text-base font-semibold text-gray-900">Image Carousel</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">Shown after this post's content and before the share section.</p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#5e3fde] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4b32b2]"
          >
            <ImagePlus className="h-4 w-4" />
            {images.length ? 'Add / Select Images' : 'Select Images'}
          </button>
        </div>

        <div className="space-y-6 p-5">
          <div className="grid gap-5 rounded-xl border border-gray-200 bg-gray-50 p-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label htmlFor="post-carousel-heading" className="mb-1.5 block text-sm font-medium text-gray-700">
                Carousel Heading
              </label>
              <input
                id="post-carousel-heading"
                type="text"
                value={settings.heading}
                onChange={(event) => updateSettings({ heading: event.target.value.slice(0, 191) })}
                placeholder="e.g. Event Gallery"
                maxLength={191}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde]"
              />
              <p className="mt-1 text-xs text-gray-500">Optional. Leave blank if you do not want a heading above the carousel.</p>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-gray-700">Images Per View</span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Images per view">
                {([1, 2, 3] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    aria-checked={settings.slidesPerView === count}
                    onClick={() => updateSettings({ slidesPerView: count })}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                      settings.slidesPerView === count
                        ? 'border-[#5e3fde] bg-[#5e3fde] text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-[#5e3fde]/60'
                    }`}
                  >
                    {count} {count === 1 ? 'Image' : 'Images'}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">Desktop setting. Tablet shows up to 2 and mobile shows 1 image.</p>
            </div>

            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-300 bg-white px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-gray-700">Auto Rotate</span>
                  <span className="mt-0.5 block text-xs text-gray-500">Automatically move to the next image.</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.autoplay}
                  onChange={(event) => updateSettings({ autoplay: event.target.checked })}
                  className="h-4 w-4 accent-[#5e3fde]"
                />
              </label>

              <div>
                <label htmlFor="post-carousel-speed" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Auto Rotate Speed
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="post-carousel-speed"
                    type="number"
                    min="1.5"
                    max="15"
                    step="0.5"
                    disabled={!settings.autoplay}
                    value={settings.autoplayDelay / 1000}
                    onChange={(event) => {
                      const seconds = Number(event.target.value);
                      if (!Number.isFinite(seconds)) return;
                      const delay = Math.max(1500, Math.min(15000, Math.round(seconds * 1000)));
                      updateSettings({ autoplayDelay: delay });
                    }}
                    className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <span className="text-sm text-gray-500">seconds</span>
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-300 bg-white px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-gray-700">Show Pagination</span>
                  <span className="mt-0.5 block text-xs text-gray-500">Display clickable dots below the carousel and keep them synced with arrows, autoplay and swipe.</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.pagination}
                  onChange={(event) => updateSettings({ pagination: event.target.checked })}
                  className="h-4 w-4 accent-[#5e3fde]"
                />
              </label>
            </div>
          </div>

          {images.length === 0 ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center transition-colors hover:border-[#5e3fde]/50 hover:bg-[#5e3fde]/5"
            >
              <ImagePlus className="mb-3 h-9 w-9 text-gray-400" />
              <span className="font-medium text-gray-700">No carousel images selected</span>
              <span className="mt-1 text-sm text-gray-500">Choose multiple images from the Media Library.</span>
            </button>
          ) : (
            <>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={images.map((image) => image.mediaId)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {images.map((image) => (
                      <SortableCarouselImage
                        key={image.mediaId}
                        image={image}
                        onRemove={() => onChange(images.filter((item) => item.mediaId !== image.mediaId))}
                        onCaptionChange={(caption) => onChange(images.map((item) => item.mediaId === image.mediaId ? { ...item, caption } : item))}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <p className="text-xs text-gray-500">Drag the handle on each image to change the display order. Captions are optional.</p>
            </>
          )}
        </div>
      </section>

      <CarouselMediaPicker
        isOpen={pickerOpen}
        currentImages={images}
        onClose={() => setPickerOpen(false)}
        onApply={onChange}
      />
    </>
  );
}
