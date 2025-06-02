// 1. クライアント側コンポーネント (components/FileUpload.tsx)
'use client'

import { useState } from 'react'
import axios, { AxiosProgressEvent } from 'axios'

interface ChunkInfo {
  chunk: Blob
  index: number
  totalChunks: number
  fileName: string
  fileId: string
}

export default function FileUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentChunk, setCurrentChunk] = useState(0)

  const chunkSize = 1024 * 1024 * 4 // 4MB chunks (Azure Blob推奨サイズ)

  const uploadFile = async (file: File) => {
    setUploading(true)
    setProgress(0)
    setCurrentChunk(0)

    try {
      const fileId = generateFileId()
      const totalChunks = Math.ceil(file.size / chunkSize)
      const blobName = `${Date.now()}_${file.name}`
      
      // 1. Blob初期化
      await initializeBlob(blobName, fileId)
      
      // 2. 各チャンクを直接Blobにアップロード
      const blockIds: string[] = []
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        const chunk = file.slice(start, end)
        
        const blockId = await uploadChunkToBlob({
          chunk,
          index: i,
          totalChunks,
          fileName: file.name,
          fileId,
          blobName
        })
        
        blockIds.push(blockId)
        setCurrentChunk(i + 1)
        setProgress(((i + 1) / totalChunks) * 100)
      }

      // 3. ブロックをコミットしてファイル完成
      const result = await commitBlob(blobName, blockIds)
      
      alert(`アップロード完了!\nURL: ${result.blobUrl}`)
    } catch (error) {
      console.error('アップロードエラー:', error)
      if (axios.isAxiosError(error)) {
        alert(`アップロードに失敗しました: ${error.response?.data?.error || error.message}`)
      } else {
        alert('アップロードに失敗しました')
      }
    } finally {
      setUploading(false)
      setProgress(0)
      setCurrentChunk(0)
    }
  }

  const initializeBlob = async (blobName: string, fileId: string) => {
    try {
      const response = await axios.post('/api/initialize-blob', {
        blobName,
        fileId
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      })
      
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Blob初期化失敗: ${error.response?.data?.error || error.message}`)
      }
      throw error
    }
  }

  const uploadChunkToBlob = async (chunkInfo: ChunkInfo & { blobName: string }) => {
    const formData = new FormData()
    formData.append('chunk', chunkInfo.chunk)
    formData.append('index', chunkInfo.index.toString())
    formData.append('blobName', chunkInfo.blobName)
    formData.append('fileId', chunkInfo.fileId)

    try {
      const response = await axios.post('/api/upload-block', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          // 個別チャンクの進捗は全体進捗に含まれる
        }
      })
      
      return response.data.blockId
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`ブロック ${chunkInfo.index + 1} アップロード失敗: ${error.response?.data?.error || error.message}`)
      }
      throw error
    }
  }

  const commitBlob = async (blobName: string, blockIds: string[]) => {
    try {
      const response = await axios.post('/api/commit-blob', {
        blobName,
        blockIds
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      })
      
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Blobコミット失敗: ${error.response?.data?.error || error.message}`)
      }
      throw error
    }
  }

  const generateFileId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadFile(file)
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

// 2. Blob初期化 API (app/api/initialize-blob/route.ts)
import { NextRequest, NextResponse } from 'next/server'
import { BlobServiceClient } from '@azure/storage-blob'

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!
const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads'

export async function POST(request: NextRequest) {
  try {
    const { blobName, fileId } = await request.json()

    if (!blobName || !fileId) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    const containerClient = blobServiceClient.getContainerClient(containerName)
    
    // コンテナが存在しない場合は作成
    await containerClient.createIfNotExists({ access: 'blob' })

    return NextResponse.json({ 
      success: true, 
      message: 'Blob初期化完了',
      blobName 
    })

  } catch (error) {
    console.error('Blob初期化エラー:', error)
    return NextResponse.json({ error: 'Blob初期化に失敗しました' }, { status: 500 })
  }
}

// 3. ブロックアップロード API (app/api/upload-block/route.ts)
import { NextRequest, NextResponse } from 'next/server'
import { BlobServiceClient } from '@azure/storage-blob'
import { Buffer } from 'buffer'

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!
const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const index = parseInt(formData.get('index') as string)
    const blobName = formData.get('blobName') as string
    const fileId = formData.get('fileId') as string

    if (!chunk || index === undefined || !blobName || !fileId) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
    }

    // ブロックIDを生成（Base64エンコードされた固定長文字列）
    const blockId = Buffer.from(`block_${index.toString().padStart(6, '0')}`).toString('base64')

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    const containerClient = blobServiceClient.getContainerClient(containerName)
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    // チャンクデータを取得
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer())

    // ブロックをアップロード
    await blockBlobClient.stageBlock(blockId, chunkBuffer, chunkBuffer.length)

    return NextResponse.json({ 
      success: true, 
      blockId,
      message: `ブロック ${index + 1} アップロード完了` 
    })

  } catch (error) {
    console.error('ブロックアップロードエラー:', error)
    return NextResponse.json({ error: 'ブロックアップロードに失敗しました' }, { status: 500 })
  }
}

// 4. Blobコミット API (app/api/commit-blob/route.ts)
import { NextRequest, NextResponse } from 'next/server'
import { BlobServiceClient } from '@azure/storage-blob'

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!
const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads'

export async function POST(request: NextRequest) {
  try {
    const { blobName, blockIds } = await request.json()

    if (!blobName || !Array.isArray(blockIds) || blockIds.length === 0) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    const containerClient = blobServiceClient.getContainerClient(containerName)
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    // すべてのブロックをコミットしてファイルを完成
    await blockBlobClient.commitBlockList(blockIds)

    const blobUrl = blockBlobClient.url

    return NextResponse.json({ 
      success: true, 
      message: 'ファイルアップロード完了',
      blobUrl,
      blobName
    })

  } catch (error) {
    console.error('Blobコミットエラー:', error)
    return NextResponse.json({ error: 'Blobコミットに失敗しました' }, { status: 500 })
  }
}

// 5. 環境変数設定 (.env.local)
/*
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=your_account;AccountKey=your_key;EndpointSuffix=core.windows.net
AZURE_CONTAINER_NAME=uploads
*/

// 6. 必要なパッケージのインストール
/*
npm install @azure/storage-blob axios
npm install --save-dev @types/node
*/

// 7. 使用例 (app/page.tsx)
import FileUpload from '@/components/FileUpload'

export default function Home() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">ファイルアップロード (ダイレクトBlob)</h1>
      <FileUpload />
    </main>
  )
}