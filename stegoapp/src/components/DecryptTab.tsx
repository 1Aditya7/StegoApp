'use client'

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DecryptTab() {
  const [image, setImage] = useState<File | null>(null)
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
    }
  }

  const decryptImage = () => {
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

        const descrambled = unscramblePixels(imageData, password)
        ctx?.putImageData(descrambled, 0, 0)

        const hiddenMessage = decodeMessageFromImage(descrambled)
        setMessage(hiddenMessage)
      }
    }

    reader.readAsDataURL(image)
  }

  return (
    <div className="flex flex-col gap-4">
      <Label>Upload Scrambled Image</Label>
      <Input type="file" accept="image/*" onChange={handleImageChange} />

      <Label>Password</Label>
      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <Button onClick={decryptImage}>Unscramble & Decrypt</Button>
      <canvas ref={canvasRef} className="w-full border rounded" />

      <div className="space-y-2">
        <Label>Decrypted Message</Label>
        <div className="p-2 border rounded bg-muted text-sm">{message || "[no message found]"}</div>
      </div>
    </div>
  )
}

// === HELPERS ===

function unscramblePixels(imageData: ImageData, password: string): ImageData {
  const { data, width, height } = imageData
  const shuffled = new Uint8ClampedArray(data)
  const rand = mulberry32(seedFromPassword(password))
  const swaps: [number, number][] = []
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
          swaps.push([srcIdx, dstIdx])
        }
      }
    }
  }

  for (let i = swaps.length - 1; i >= 0; i--) {
    const [a, b] = swaps[i]
    for (let j = 0; j < 4; j++) {
      const temp = shuffled[a + j]
      shuffled[a + j] = shuffled[b + j]
      shuffled[b + j] = temp
    }
  }

  return new ImageData(shuffled, width, height)
}

function decodeMessageFromImage(imageData: ImageData): string {
  const data = imageData.data
  let bits = []

  for (let i = 0; i < data.length; i++) {
    bits.push(data[i] & 1)
  }

  let chars = []
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8).join("")
    const charCode = parseInt(byte, 2)
    if (charCode === 0) break
    chars.push(String.fromCharCode(charCode))
  }

  return chars.join("")
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
