import { uploadBlobByChunk } from "@/services/azure-blob-service"

export async function POST(req: Request) {
  const formData = await req.formData()
  const chunk = formData.get('chunk') as File
  const index = formData.get('index') as string
  const containerName = formData.get('containerName') as string
  const blobName = formData.get('blobName') as string
  if (!chunk || !index) {
    return new Response('Bad Request', { status: 400 })
  }

  // ファイルを保存するロジックをここに実装
  const response = await uploadBlobByChunk(containerName, blobName, chunk, parseInt(index))
  return new Response(JSON.stringify(response), { status: 200 })
}