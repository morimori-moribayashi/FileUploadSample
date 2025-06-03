"use client"
import Image from "next/image";
import { useState } from "react";
import { chunkUpload } from "@/utils/chunkUpload";

export default function Home() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)
    setProgress(0)

    try {
      console.log('Selected file:', file.name)
      await chunkUpload(file, (progress: number) => {
        console.log(`Upload progress: ${progress}%`)
        setProgress(progress)
      })
      console.log('Upload completed')
    } catch (err) {
      console.error('Upload error:', err)
      setError('アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  return (
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
          <p className="text-sm text-gray-600 mt-2">
            アップロード中... {progress}%
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
}