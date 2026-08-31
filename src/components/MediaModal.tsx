'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

interface Media {
  id: number;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
}

export default function MediaModal({
  isOpen,
  onClose,
  onInsert,
}: MediaModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('library');
  const [media, setMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchMedia = useCallback(async () => {
    try {
      setIsLoading(true);

      const res = await fetch(
        `${BASE_PATH}/api/media?_=${Date.now()}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );

      if (res.ok) {
        const data: Media[] = await res.json();
        setMedia(data);
      } else {
        console.error('Failed to fetch media:', res.status);
      }
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedMedia(null);
      setActiveTab('library');
      fetchMedia();
    }
  }, [isOpen, fetchMedia]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    let lastUploadedMedia: Media | null = null;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await fetch(`${BASE_PATH}/api/upload`, {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const uploadedMedia: Media = await res.json();

            lastUploadedMedia = uploadedMedia;

            setMedia((prev) => [
              uploadedMedia,
              ...prev.filter((item) => item.id !== uploadedMedia.id),
            ]);

            toast.success(`${file.name} uploaded`);
          } else {
            const errorData = await res.json().catch(() => null);

            console.error(
              'Upload failed:',
              res.status,
              errorData
            );

            toast.error(
              errorData?.error || `Failed to upload ${file.name}`
            );
          }
        } catch (error) {
          console.error('Upload request failed:', error);
          toast.error(`Error uploading ${file.name}`);
        }
      }

      setActiveTab('library');

      if (lastUploadedMedia) {
        setSelectedMedia(lastUploadedMedia);
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8 font-sans">
      <div className="bg-white w-full max-w-6xl h-full max-h-[800px] flex flex-col rounded-md shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-medium text-gray-900">
            Add Media
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-gray-200 bg-gray-50">
          <button
            type="button"
            className={`py-3 px-4 text-[14px] font-medium border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-[#5e3fde] text-gray-900'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Files
          </button>

          <button
            type="button"
            className={`py-3 px-4 text-[14px] font-medium border-b-2 transition-colors ${
              activeTab === 'library'
                ? 'border-[#5e3fde] text-gray-900'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('library')}
          >
            Media Library
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="absolute inset-0 p-8 flex flex-col items-center justify-center">
              <div
                className={`w-full max-w-2xl border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive
                    ? 'border-[#5e3fde] bg-[#f0f6fc]'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  handleUpload(e.dataTransfer.files);
                }}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />

                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Drop files to upload
                </h3>

                <p className="text-gray-500 mb-6">
                  or
                </p>

                <div className="relative inline-block">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handleUpload(e.target.files)}
                    disabled={isUploading}
                  />

                  <button
                    type="button"
                    disabled={isUploading}
                    className="bg-[#5e3fde] text-white px-5 py-2 rounded-[3px] text-[14px] font-medium hover:bg-[#4b32b2] disabled:opacity-50 transition-colors"
                  >
                    {isUploading ? 'Uploading...' : 'Select Files'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Media Library Tab */}
          {activeTab === 'library' && (
            <div className="absolute inset-0 flex">

              {/* Media Grid */}
              <div className="flex-1 p-4 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-12 text-gray-500">
                    Loading media...
                  </div>
                ) : media.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No media files found.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {media.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedMedia(item)}
                        className={`relative aspect-square border-4 cursor-pointer overflow-hidden bg-gray-100 ${
                          selectedMedia?.id === item.id
                            ? 'border-[#5e3fde]'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        {item.mimeType.startsWith('image/') ? (
                          <img
                            src={item.url}
                            alt={item.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full p-2">
                            <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />

                            <span className="text-[10px] text-gray-500 text-center break-all line-clamp-2">
                              {item.filename}
                            </span>
                          </div>
                        )}

                        {selectedMedia?.id === item.id && (
                          <div className="absolute top-0 right-0 bg-[#5e3fde] text-white p-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attachment Details */}
              <div className="w-72 bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
                <h3 className="font-semibold text-gray-900 mb-4 text-[13px] uppercase">
                  Attachment Details
                </h3>

                {selectedMedia ? (
                  <div className="space-y-4 text-[13px]">

                    {selectedMedia.mimeType.startsWith('image/') && (
                      <img
                        src={selectedMedia.url}
                        alt={selectedMedia.filename}
                        className="w-full h-auto bg-gray-200 mb-4"
                      />
                    )}

                    <div>
                      <div className="font-semibold text-gray-900 truncate">
                        {selectedMedia.filename}
                      </div>

                      <div className="text-gray-500">
                        {new Date(
                          selectedMedia.createdAt
                        ).toLocaleDateString()}
                      </div>

                      <div className="text-gray-500">
                        {Math.round(selectedMedia.size / 1024)} KB
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <label className="block text-gray-600 mb-1">
                        URL
                      </label>

                      <input
                        type="text"
                        readOnly
                        value={selectedMedia.url}
                        className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-[#5e3fde]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-[13px]">
                    Select an item to view its details.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[#5e3fde] border border-[#5e3fde] rounded hover:bg-gray-100 transition-colors text-[14px]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedMedia) {
                onInsert(selectedMedia.url);
                onClose();
              }
            }}
            disabled={!selectedMedia}
            className="px-5 py-2 bg-[#5e3fde] text-white rounded font-medium hover:bg-[#4b32b2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[14px]"
          >
            Insert into page
          </button>
        </div>
      </div>
    </div>
  );
}