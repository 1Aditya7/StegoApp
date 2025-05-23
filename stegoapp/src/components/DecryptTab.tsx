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
      img.onload = async () => {
        const canvas = canvasRef.current!
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
        if (!imageData) return

        try {
          const bits = extractWithPRNG(imageData, password)
          const result = await decodeStegoBits(bits, password)
          setMessage(result)
        } catch (err) {
          console.error(err)
          setMessage("[Failed to decrypt]")
        }
      }
    }

    reader.readAsDataURL(image)
  }

  return (
    <div className="flex flex-col gap-4">
      <Label>Upload Encrypted Image</Label>
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

// === Helpers ===

function extractWithPRNG(imageData: ImageData, password: string): number[] {
  const data = imageData.data
  const positions = generateShuffledPositions(data.length, password)
  const bits: number[] = []
  for (let i = 0; i < positions.length; i++) {
    const idx = positions[i]
    if (idx % 4 === 3) continue
    bits.push(data[idx] & 1)
  }
  return bits
}

async function decodeStegoBits(bits: number[], password: string): Promise<string> {
  const getByte = (start: number) =>
    parseInt(bits.slice(start, start + 8).join(""), 2)

  const lenBits = bits.slice(0, 16)
  const msgLen = parseInt(lenBits.join(""), 2)
  const byteStart = 16
  const encrypted = new Uint8Array(
    Array.from({ length: msgLen }, (_, i) => getByte(byteStart + i * 8))
  )

  return await decryptMessageAES(encrypted, password)
}

async function decryptMessageAES(encrypted: Uint8Array, password: string): Promise<string> {
  const salt = encrypted.slice(0, 16)
  const iv = encrypted.slice(16, 28)
  const ciphertext = encrypted.slice(28)
  const key = await deriveKey(password, salt)
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"])
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

function generateShuffledPositions(length: number, password: string): number[] {
  const arr = Array.from({ length }, (_, i) => i)
  const rand = mulberry32(seedFromPassword(password))
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed += 0x6D2B79F5
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t ^= t >>> 7; t += Math.imul(t, 61 | t)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function seedFromPassword(pw: string): number {
  return Array.from(pw).reduce((a, c) => a + c.charCodeAt(0), 0)
}
