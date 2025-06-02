"use client"
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentChunk, setCurrentChunk] = useState(0)
  return (
    <div>
         <div className="p-6">
      <div className="mb-4">
        <input
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
      
      {uploading && (
        <div className="mb-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            アップロード中... {Math.round(progress)}% ({currentChunk} ブロック完了)
          </p>
        </div>
      )}
    </div>
  )
}
    </div>
  );
}