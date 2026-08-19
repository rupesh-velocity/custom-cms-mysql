'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, Trash2, Image as ImageIcon, Search, CheckSquare, Square, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

interface Media {
  id: number;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  altText: string | null;
  createdAt: string;
}

export default function MediaLibrary() {
  const [media, setMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_PATH}/api/media`);
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
      }
    } catch (error) {
      toast.error('Failed to load media');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  useEffect(() => {
    if (selectedMedia?.mimeType === 'application/pdf' && selectedMedia.url.startsWith('data:application/pdf;base64,')) {
      try {
        const base64 = selectedMedia.url.split(',')[1];
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Failed to convert base64 to blob URL', e);
        setPdfBlobUrl(selectedMedia.url);
      }
    } else {
      setPdfBlobUrl(selectedMedia?.url || null);
    }
  }, [selectedMedia]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

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
          toast.success(`${file.name} uploaded`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      } catch (error) {
        toast.error(`Error uploading ${file.name}`);
      }
    }
    
    setIsUploading(false);
    fetchMedia();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(`${BASE_PATH}/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Media deleted');
        if (selectedMedia?.id === id) setSelectedMedia(null);
        setSelectedMediaIds(prev => prev.filter(selectedId => selectedId !== id));
        fetchMedia();
      } else {
        toast.error('Failed to delete media');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedMediaIds.length} files? This action cannot be undone.`)) return;
    
    setIsBulkDeleting(true);
    let successCount = 0;
    
    for (const id of selectedMediaIds) {
      try {
        const res = await fetch(`${BASE_PATH}/api/media/${id}`, { method: 'DELETE' });
        if (res.ok) successCount++;
      } catch (error) {
        console.error('Failed to delete', id);
      }
    }
    
    toast.success(`Deleted ${successCount} files`);
    setSelectedMediaIds([]);
    setIsBulkDeleting(false);
    fetchMedia();
  };

  const toggleSelection = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMediaIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const filteredMedia = useMemo(() => {
    if (!searchQuery.trim()) return media;
    const query = searchQuery.toLowerCase();
    return media.filter(item => 
      item.filename.toLowerCase().includes(query) || 
      (item.altText && item.altText.toLowerCase().includes(query))
    );
  }, [media, searchQuery]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/media/${selectedMedia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          altText: selectedMedia.altText,
          filename: selectedMedia.filename
        })
      });
      
      if (res.ok) {
        toast.success('Saved');
        fetchMedia();
      } else {
        toast.error('Failed to save');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
    setIsUpdating(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-light text-[#1d2327]">Media Library</h1>
        <div className="relative">
          <input 
            type="file" 
            multiple 
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => handleUpload(e.target.files)}
            disabled={isUploading}
          />
          <button 
            disabled={isUploading}
            className="bg-white border border-[#5e3fde] text-[#5e3fde] px-4 py-1.5 rounded-[3px] text-[13px] font-semibold hover:bg-[#f6f7f7] disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Add New'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative max-w-sm w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search media..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-[#8c8f94] rounded-[3px] text-[13px] focus:border-[#5e3fde] outline-none"
          />
        </div>
        
        {selectedMediaIds.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 px-4 py-1.5 rounded border border-red-100">
            <span className="text-[13px] text-red-700 font-medium">{selectedMediaIds.length} selected</span>
            <button 
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={14} />
              {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
            </button>
            <button 
              onClick={() => setSelectedMediaIds([])}
              className="text-xs text-red-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div 
        className={`w-full border-2 border-dashed rounded-lg p-12 text-center mb-8 transition-colors ${dragActive ? 'border-[#5e3fde] bg-[#f0f6fc]' : 'border-[#c3c4c7] bg-white'}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDrop={(e) => { 
          e.preventDefault(); 
          setDragActive(false);
          handleUpload(e.dataTransfer.files);
        }}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">Drop files here</h3>
        <p className="text-gray-500 mb-4">or</p>
        <div className="relative inline-block">
          <input 
            type="file" 
            multiple 
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => handleUpload(e.target.files)}
            disabled={isUploading}
          />
          <button className="bg-white border border-[#5e3fde] text-[#5e3fde] px-4 py-1.5 rounded-[3px] text-[13px] font-semibold hover:bg-[#f6f7f7] disabled:opacity-50">
            Select Files
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading media...</div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-[#c3c4c7] bg-white rounded-[3px]">
          {media.length === 0 ? 'No media files found. Upload some files to get started.' : 'No files match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {filteredMedia.map((item) => (
            <div 
              key={item.id} 
              className={`relative group bg-white border ${selectedMediaIds.includes(item.id) ? 'border-[#5e3fde] ring-2 ring-[#5e3fde]/20' : 'border-[#c3c4c7]'} rounded-[3px] aspect-square flex items-center justify-center overflow-hidden cursor-pointer transition-all`}
            >
              <div 
                className="absolute inset-0 z-10" 
                onClick={() => setSelectedMedia(item)}
              />
              <button 
                onClick={(e) => toggleSelection(item.id, e)}
                className={`absolute top-2 right-2 z-20 bg-white rounded flex items-center justify-center shadow-sm ${selectedMediaIds.includes(item.id) ? 'text-[#5e3fde] opacity-100' : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-500'} transition-opacity`}
              >
                {selectedMediaIds.includes(item.id) ? <CheckSquare size={20} className="fill-white" /> : <Square size={20} />}
              </button>
              
              {item.mimeType.startsWith('image/') ? (
                <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center p-4">
                  <FileText className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-[11px] text-gray-500 text-center break-all line-clamp-2">{item.filename}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Attachment Details Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8 font-sans">
          <div className="bg-white w-full max-w-5xl h-full max-h-[700px] flex rounded-md shadow-xl overflow-hidden relative">
            <button 
              onClick={() => setSelectedMedia(null)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 z-10 bg-white rounded-full p-1 shadow"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            {/* Left side: Image Preview */}
            <div className="flex-1 bg-gray-100 p-8 flex items-center justify-center overflow-hidden border-r border-gray-200">
              {selectedMedia.mimeType.startsWith('image/') ? (
                <img src={selectedMedia.url} alt={selectedMedia.filename} className="max-w-full max-h-full object-contain shadow-sm" />
              ) : selectedMedia.mimeType === 'application/pdf' ? (
                <iframe src={pdfBlobUrl || selectedMedia.url} className="w-full h-full border-0" title={selectedMedia.filename} />
              ) : (
                <div className="flex flex-col items-center">
                  <FileText className="w-24 h-24 text-gray-400 mb-4" />
                  <span className="text-gray-500">{selectedMedia.filename}</span>
                </div>
              )}
            </div>
            
            {/* Right side: Details and Edit Form */}
            <div className="w-80 bg-gray-50 p-6 overflow-y-auto">
              <h3 className="font-semibold text-gray-900 mb-4 text-[13px] uppercase">Attachment Details</h3>
              <div className="space-y-4 text-[13px] mb-8">
                <div>
                  <div className="font-semibold text-gray-900 truncate">{selectedMedia.filename}</div>
                  <div className="text-gray-500">{new Date(selectedMedia.createdAt).toLocaleDateString()}</div>
                  <div className="text-gray-500">{formatBytes(selectedMedia.size)}</div>
                </div>
                
                <div className="pt-2">
                  <button 
                    onClick={() => handleDelete(selectedMedia.id)}
                    className="text-[#d63638] hover:underline"
                  >
                    Delete permanently
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleUpdate} className="space-y-4 text-[13px] border-t border-gray-200 pt-6">
                <div>
                  <label className="block text-gray-600 mb-1 font-semibold">Alternative Text</label>
                  <textarea 
                    value={selectedMedia.altText || ''}
                    onChange={(e) => setSelectedMedia({...selectedMedia, altText: e.target.value})}
                    className="w-full border border-[#8c8f94] rounded-[3px] px-2 py-1.5 focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde] outline-none"
                    rows={3}
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Describe the purpose of the image. Leave empty if the image is purely decorative.</p>
                </div>
                
                <div>
                  <label className="block text-gray-600 mb-1 font-semibold">Title</label>
                  <input 
                    type="text" 
                    value={selectedMedia.filename}
                    onChange={(e) => setSelectedMedia({...selectedMedia, filename: e.target.value})}
                    className="w-full border border-[#8c8f94] rounded-[3px] px-2 py-1.5 focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde] outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-600 mb-1 font-semibold">File URL</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={selectedMedia.url} 
                    className="w-full border border-[#8c8f94] bg-gray-100 rounded-[3px] px-2 py-1.5 text-gray-500"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const fullUrl = new URL(selectedMedia.url, window.location.origin).toString();
                      navigator.clipboard.writeText(fullUrl);
                      toast.success('URL copied to clipboard');
                    }}
                    className="mt-2 text-[#5e3fde] hover:underline"
                  >
                    Copy URL to clipboard
                  </button>
                </div>
                
                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="bg-[#5e3fde] text-white px-4 py-1.5 rounded-[3px] font-semibold hover:bg-[#4b32b2] disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
