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

        let imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
        if (!imageData) return

        // Encrypt message and encode
        const encrypted = await encryptMessageAES(message, password)
        const binary = buildStegoBinary(encrypted)
        const encoded = embedBitsInImage(imageData, binary)

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

      <Button onClick={encryptImage}>Encrypt & Scramble</Button>
      <canvas ref={canvasRef} className="w-full border rounded" />

      <Button variant="secondary" onClick={downloadImage}>Download Image</Button>
    </div>
  )
}
// === HELPERS ===
async function encryptMessageAES(message: string, password: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const key = await deriveKey(password, salt)
  const cipherText = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(message)
  )

  const combined = new Uint8Array(salt.length + iv.length + cipherText.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(cipherText), salt.length + iv.length)
  return combined
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  )
}

function buildStegoBinary(encrypted: Uint8Array): number[] {
  const header = "$STEG"
  const headerBits = [...header].flatMap(c =>
    c.charCodeAt(0).toString(2).padStart(8, '0').split('').map(Number)
  )

  const len = encrypted.length
  const lenBits = len.toString(2).padStart(16, '0').split('').map(Number)
  const dataBits = [...encrypted].flatMap(b =>
    b.toString(2).padStart(8, '0').split('').map(Number)
  )

  return [...headerBits, ...lenBits, ...dataBits]
}

function embedBitsInImage(imageData: ImageData, bits: number[]): ImageData {
  const data = imageData.data
  let bitIndex = 0

  for (let i = 0; i < data.length && bitIndex < bits.length; i++) {
    if ((i + 1) % 4 === 0) continue // skip alpha
    data[i] = (data[i] & 0xFE) | bits[bitIndex]
    bitIndex++
  }

  return new ImageData(data, imageData.width, imageData.height)
}
