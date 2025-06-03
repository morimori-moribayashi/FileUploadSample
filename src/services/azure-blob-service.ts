import { BlobServiceClient } from "@azure/storage-blob"

const AZURE_BLOB_STORAGE_CONNECTION_STRING = process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING

interface uploadBlobResponse{
    success: boolean
    blockId?: string
    error?: any
}

function initializeBlob(){
    const connectionString = AZURE_BLOB_STORAGE_CONNECTION_STRING
    if(!connectionString){
        throw new Error("AZURE_BLOB_STORAGE_CONNECTION_STRING is not defined")
    }
    const blobServiceClient = new BlobServiceClient(connectionString)
    return blobServiceClient
}

async function createContainer(containerName: string){
    const blobServiceClient = initializeBlob()
    const containerClient = blobServiceClient.getContainerClient(containerName)
    await containerClient.createIfNotExists()
    return containerClient
}

export async function uploadBlobByChunk(containerName: string, blobName: string, chunk: File, index: number): Promise<uploadBlobResponse>{
    try{
        const containerClient = await createContainer(containerName)
        const blockBlobClient = containerClient.getBlockBlobClient(blobName)

        const blockId = Buffer.from(index.toString()).toString('base64')
        const chunk_buffer = Buffer.from(await chunk.arrayBuffer())
        await blockBlobClient.stageBlock(blockId, chunk_buffer, chunk_buffer.length)
        return {
            success: true,
            blockId: blockId
        }
    }catch(error){
        console.error("Error uploading blob:", error)
        return {
            success: false,
            error: error
        }
    }
}

export async function commitUpload(containerName: string, blobName: string, blockIds: string[]){
    try{
        const containerClient = await createContainer(containerName)
        const blockBlobClient = containerClient.getBlockBlobClient(blobName)
        await blockBlobClient.commitBlockList(blockIds)
    }catch(error){
        console.error("Error committing upload:", error)
        throw error
    }
}