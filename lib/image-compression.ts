
import imageCompression from 'browser-image-compression'

export async function compressPaymentProof(file: File): Promise<File> {
    // Reject files larger than 5MB to save bandwidth/processing
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size too large. Please upload an image under 5MB.')
    }

    const options = {
        maxSizeMB: 1,          // Max output size 1MB
        maxWidthOrHeight: 1920,// Max dimension 1920px
        useWebWorker: true,
    }

    try {
        const compressedFile = await imageCompression(file, options)
        return compressedFile
    } catch (error) {
        console.error('Image compression error:', error)
        throw new Error('Failed to process image. Please try another file.')
    }
}
