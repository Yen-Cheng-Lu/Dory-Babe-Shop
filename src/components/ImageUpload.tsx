import React, { useState, useRef } from 'react';
import { UploadCloud, X } from 'lucide-react';

interface ImageUploadProps {
  value: string | string[];
  onChange: (value: any) => void;
  multiple?: boolean;
  label?: string;
}

export default function ImageUpload({ value, onChange, multiple = false, label = "上傳圖片" }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const readAsDataURL = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to JPEG
            } else {
              resolve(e.target?.result as string);
            }
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    if (multiple) {
      Promise.all(validFiles.map(readAsDataURL)).then(newImages => {
        const currentImages = Array.isArray(value) ? value : [];
        onChange([...currentImages, ...newImages]);
      });
    } else {
      readAsDataURL(validFiles[0]).then(newImage => {
        onChange(newImage);
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeImage = (indexToRemove?: number) => {
    if (multiple && Array.isArray(value)) {
      onChange(value.filter((_, index) => index !== indexToRemove));
    } else {
      onChange("");
    }
  };

  const images = multiple ? (Array.isArray(value) ? value : []) : (value ? [value as string] : []);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-stone-700">{label}</label>
      
      {images.length > 0 && (
        <div className={`grid gap-4 ${multiple ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {images.map((img, index) => (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 group bg-stone-100">
              <img src={img} alt="Uploaded" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(multiple ? index : undefined)}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(!value || (multiple)) && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-stone-300 hover:border-emerald-400 hover:bg-stone-50'}
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple={multiple}
            className="hidden"
          />
          <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-emerald-500' : 'text-stone-400'}`} />
          <p className="text-sm font-medium text-stone-700 mb-1">
            點擊或拖曳圖片至此
          </p>
          <p className="text-xs text-stone-500">
            支援 JPG, PNG, GIF 格式
          </p>
        </div>
      )}
    </div>
  );
}
