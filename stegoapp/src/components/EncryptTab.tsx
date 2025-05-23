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

  const encryptImage = async () => {
    if (!image || !canvasRef.current) return
    const ctx = canvasRef.current.getContext("2d")
    const img = new Image()
    const reader = new FileReader()

    reader.onload = async () => {
      img.src = reader.result as string
      img.onload = async () => {
        const canvas = canvasRef.current!
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
        if (!imageData) return

        const encrypted = await encryptMessageAES(message, password)
        const binary = buildStegoBits(encrypted)
        const encoded = embedWithPRNG(imageData, binary, password)
        ctx?.putImageData(encoded, 0, 0)
      }
    }

    reader.readAsDataURL(image)
  }

  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = "encrypted.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  return (
    <div className="flex flex-col gap-4">
      <Label>Upload Image</Label>
      <Input type="file" accept="image/*" onChange={handleImageChange} />

      <Label>Secret Message</Label>
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />

      <Label>Password</Label>
      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <Button onClick={encryptImage}>Encrypt & Embed</Button>
      <canvas ref={canvasRef} className="w-full border rounded" />
      <Button onClick={downloadImage}>Download Image</Button>
    </div>
  )
}

// --- Helpers ---

async function encryptMessageAES(message: string, password: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(message))
  const full = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  full.set(salt, 0)
  full.set(iv, salt.length)
  full.set(new Uint8Array(ciphertext), salt.length + iv.length)
  return full
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"])
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

function buildStegoBits(payload: Uint8Array): number[] {
  const lenBits = payload.length.toString(2).padStart(16, '0').split('').map(Number)
  const dataBits = [...payload].flatMap(b => b.toString(2).padStart(8, '0').split('').map(Number))
  return [...lenBits, ...dataBits]
}

function embedWithPRNG(imageData: ImageData, bits: number[], password: string): ImageData {
  const data = imageData.data
  const positions = generateShuffledPositions(data.length, password)
  let j = 0
  for (let i = 0; i < positions.length && j < bits.length; i++) {
    const idx = positions[i]
    if (idx % 4 === 3) continue
    data[idx] = (data[idx] & 0xFE) | bits[j++]
  }
  return new ImageData(data, imageData.width, imageData.height)
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
