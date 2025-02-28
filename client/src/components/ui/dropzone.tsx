import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';

interface DropzoneProps {
  onFilesDrop: (files: File[]) => void;
  className?: string;
}

export function Dropzone({ onFilesDrop, className }: DropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesDrop(acceptedFiles);
  }, [onFilesDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
        isDragActive 
          ? "border-indigo-500 bg-indigo-50" 
          : "border-gray-300 hover:border-gray-400",
        className
      )}
    >
      <input {...getInputProps()} />
      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
      {isDragActive ? (
        <p className="text-sm text-gray-600">Drop the files here...</p>
      ) : (
        <p className="text-sm text-gray-600">
          Drag and drop files here, or click to select files
        </p>
      )}
    </div>
  );
}
