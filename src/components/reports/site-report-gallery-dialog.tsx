"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { useState, useEffect } from "react";
import { ReportPhoto } from "./types";

interface SiteReportGalleryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  photos: ReportPhoto[];
  initialIndex?: number;
}

export function SiteReportGalleryDialog({ isOpen, onClose, photos, initialIndex = 0 }: SiteReportGalleryDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen && !prevIsOpen) {
    setCurrentIndex(initialIndex);
    setPrevIsOpen(true);
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95">
      <div className="relative w-full h-full flex flex-col justify-between">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
          <p className="text-white text-sm font-medium">
            Ảnh {currentIndex + 1} / {photos.length}
          </p>
          <CloseButton onClick={onClose} className="bg-black/40 text-white border-transparent hover:bg-white/20 hover:text-white border-none" />
        </div>

        {/* Main Image */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden px-4 sm:px-16 pt-16 pb-24" onClick={onClose}>
          {photos.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 p-2 sm:p-3 bg-black/40 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {currentPhoto.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption || `Ảnh ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {photos.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 p-2 sm:p-3 bg-black/40 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}
        </div>

        {/* Thumbnails Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pb-6 overflow-x-auto">
          <div className="flex items-center justify-center gap-2 min-w-max mx-auto">
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden border-2 transition-all shrink-0 ${
                  idx === currentIndex ? "border-blue-500 scale-105" : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                {photo.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
          {currentPhoto.caption && (
            <p className="text-center text-white/90 text-sm mt-3">{currentPhoto.caption}</p>
          )}
        </div>
      </div>
    </div>
  );
}
