import React, { useRef, useState } from "react";
import { Camera, Paperclip, X, ImagePlus, UploadCloud } from "lucide-react";
import { ContentCard } from "@/components/ui/enterprise";

export function AttachmentsCard({
  photos,
  attachments,
  onAddPhotos,
  onRemovePhoto,
  onAddFiles,
  onRemoveFile
}: {
  photos: File[];
  attachments: File[];
  onAddPhotos: (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } }) => void;
  onRemovePhoto: (index: number) => void;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } }) => void;
  onRemoveFile: (index: number) => void;
}) {
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoCaptureRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    e.preventDefault();
    setter(true);
  };

  const handleDragLeave = (e: React.DragEvent, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    e.preventDefault();
    setter(false);
  };

  const handleDropPhotos = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddPhotos({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles({ target: { files: e.dataTransfer.files } });
    }
  };

  return (
    <ContentCard className="overflow-hidden p-0 sm:p-0 mb-6">
      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">
        <div className="bg-purple-100 p-1.5 rounded-lg text-purple-600">
          <Camera className="w-4 h-4" />
        </div>
        <h3 className="font-bold text-slate-800 text-[15px]">Hình ảnh & Tài liệu đính kèm</h3>
      </div>
      
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photos Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-slate-400" /> Hình ảnh hiện trường ({photos.length})
            </h4>
            <div className="flex gap-2">
              <input type="file" accept="image/*" capture="environment" className="hidden" ref={photoCaptureRef} onChange={onAddPhotos} />
              <input type="file" accept="image/*" multiple className="hidden" ref={photoInputRef} onChange={onAddPhotos} />
              
              <button type="button" onClick={() => photoCaptureRef.current?.click()} className="text-[12px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 border border-slate-200">
                <Camera className="w-3.5 h-3.5" /> Chụp ảnh
              </button>
              <button type="button" onClick={() => photoInputRef.current?.click()} className="text-[12px] font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5 border border-blue-100">
                <ImagePlus className="w-3.5 h-3.5" /> Chọn ảnh
              </button>
            </div>
          </div>
          
          <div
            onDragOver={e => handleDragOver(e, setIsDraggingPhoto)}
            onDragLeave={e => handleDragLeave(e, setIsDraggingPhoto)}
            onDrop={handleDropPhotos}
            className={`mb-4 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 transition-colors ${isDraggingPhoto ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200'}`}
          >
            <UploadCloud className={`w-8 h-8 mb-2 ${isDraggingPhoto ? 'text-blue-500' : 'text-slate-300'}`} />
            <p className="text-[13px] font-medium text-center">Kéo thả ảnh vào đây</p>
            <p className="text-[11px] mt-1 text-center">Tối đa 10 ảnh (JPG, PNG)</p>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((file, index) => (
                <div key={index} className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden group bg-slate-50">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => onRemovePhoto(index)}
                      className="bg-white text-red-500 p-1.5 rounded-full hover:bg-red-50 hover:scale-110 transition-all shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Files Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h4 className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-slate-400" /> Tài liệu đính kèm ({attachments.length})
            </h4>
            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={onAddFiles} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[12px] font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5 border border-blue-100 self-start">
              <Paperclip className="w-3.5 h-3.5" /> Thêm file
            </button>
          </div>
          
          <div
            onDragOver={e => handleDragOver(e, setIsDraggingFile)}
            onDragLeave={e => handleDragLeave(e, setIsDraggingFile)}
            onDrop={handleDropFiles}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-4 cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 transition-colors hover:bg-slate-50 ${isDraggingFile ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200'}`}
          >
            <UploadCloud className={`w-8 h-8 mb-2 ${isDraggingFile ? 'text-blue-500' : 'text-slate-300'}`} />
            <p className="text-[13px] font-medium text-center">Bấm hoặc kéo thả file</p>
            <p className="text-[11px] mt-1 text-center">PDF, DOCX, XLSX (Tối đa 5 file)</p>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="bg-slate-100 p-2 rounded-lg text-slate-500 shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ContentCard>
  );
}
