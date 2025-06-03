"use client"

import { commitUpload } from "@/services/azure-blob-service"
import axios from "axios"

export async function chunkUpload(file: File, onProgress: (progress: number) => void) {
  const containerName = "test"
  const blobName = file.name
  const chunkSize = 1024 * 1024 // 1MBのチャンクサイズ
  const totalChunks = Math.ceil(file.size / chunkSize)

  try {
    for (let i = 0; i < totalChunks; i++) {
      const formData = new FormData()
      const start = i * chunkSize
      const end = start + chunkSize
      const chunk = file.slice(start, end)
      formData.append('chunk', chunk)
      formData.append('index', i.toString())
      formData.append('containerName', containerName)
      formData.append('blobName', blobName)
      let blockIds = []
      try {
        // チャンクをアップロードするロジック
        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        if( response.status !== 200){
          throw new Error("アップロードに失敗しました")
        }
        blockIds.push(response.data.blockId)
        // アップロードの進捗を通知
        onProgress((i + 1) / totalChunks * 100)
      } catch (error) {
        console.error(`チャンク ${i + 1} のアップロードに失敗:`, error)
        throw new Error(`チャンク ${i + 1} のアップロードに失敗しました`)
      }
      await commitUpload(containerName, blobName, blockIds)
    }
  } catch (error) {
    console.error('ファイルアップロードエラー:', error)
    throw error
  }
}