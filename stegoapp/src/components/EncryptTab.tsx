'use client'

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function EncryptTab() {
  const [image, setImage] = useState<File | null>(null)
  const [message, setMessage] = useState("")
  const [password, setPassword] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
    }
  }

  const encryptImage = () => {
    if (!image || !canvasRef.current) return
    const ctx = canvasRef.current.getContext("2d")
    const img = new Image()
    const reader = new FileReader()

    reader.onload = () => {
      img.src = reader.result as string
      img.onload = () => {
        const canvas = canvasRef.current!
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        let imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
        if (!imageData) return

        imageData = encodeMessageInImage(imageData, message)
        const scrambled = scramblePixels(imageData, password)

        ctx?.putImageData(scrambled, 0, 0)
      }
    }

    reader.readAsDataURL(image)
  }

const downloadImage = () => {
  const canvas = canvasRef.current
  if (!canvas) return

  canvas.toBlob((blob) => {
    if (!blob) return
    const link = document.createElement("a")
    link.download = "encrypted.jpg"
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }, "image/jpeg", 0.7)
}

  return (
    <div className="flex flex-col gap-4">
      <Label>Upload Image</Label>
      <Input type="file" accept="image/*" onChange={handleImageChange} />

      <Label>Secret Message</Label>
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />

      <Label>Password</Label>
      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <Button onClick={encryptImage}>Encrypt & Scramble</Button>
      <canvas ref={canvasRef} className="w-full border rounded" />

      <Button variant="secondary" onClick={downloadImage}>Download Image</Button>
    </div>
  )
}

// === HELPERS ===

function scramblePixels(imageData: ImageData, password: string): ImageData {
  const { data, width, height } = imageData
  const shuffled = new Uint8ClampedArray(data)
  const rand = mulberry32(seedFromPassword(password))
  const blockSize = 10

  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      const dx = Math.floor(rand() * width)
      const dy = Math.floor(rand() * height)

      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          const sx = x + bx
          const sy = y + by
          const dx1 = (dx + bx) % width
          const dy1 = (dy + by) % height

          const srcIdx = (sy * width + sx) * 4
          const dstIdx = (dy1 * width + dx1) * 4

          for (let i = 0; i < 4; i++) {
            const temp = shuffled[srcIdx + i]
            shuffled[srcIdx + i] = shuffled[dstIdx + i]
            shuffled[dstIdx + i] = temp
          }
        }
      }
    }
  }

  return new ImageData(shuffled, width, height)
}

function encodeMessageInImage(imageData: ImageData, message: string): ImageData {
  const data = imageData.data
  const binaryMessage = (
    message.split("")
      .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
      .join("") + "00000000"
  ).split("").map(bit => parseInt(bit))

  if (binaryMessage.length > data.length) throw new Error("Message too long")

  for (let i = 0; i < binaryMessage.length; i++) {
    data[i] = (data[i] & 0xFE) | binaryMessage[i]
  }

  return new ImageData(data, imageData.width, imageData.height)
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function seedFromPassword(pw: string): number {
  return Array.from(pw).reduce((a, c) => a + c.charCodeAt(0), 0)
}
