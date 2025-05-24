'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EncryptTab from "@/components/EncryptTab"
import DecryptTab from "@/components/DecryptTab"
import LetterGlitch from "@/blocks/Backgrounds/LetterGlitch/LetterGlitch"
import { LineShadowText } from "@/components/magicui/line-shadow-text"

export default function Home() {
  return (
    <main className="relative min-h-screen bg-white overflow-hidden text-black">
      {/* Soft grey glitch animation */}
      <LetterGlitch
        glitchColors={["#ccc", "#ddd", "#eee"]}
        glitchSpeed={60}
        centerVignette={false}
        outerVignette={false}
        smooth={true}
      />

      {/* Heading */}
      <div className="absolute top-6 w-full flex justify-center z-20">
        <LineShadowText
          className="text-4xl sm:text-5xl font-black text-black italic"
        >
          Stegano.it
        </LineShadowText>
      </div>

      {/* Centered UI */}
      <div className="absolute inset-0 flex items-center justify-center z-10 p-4 pt-24">
        <div className="w-full max-w-2xl bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-xl border border-neutral-200">
          <Tabs defaultValue="encrypt" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-neutral-100 text-black rounded-md mb-4">
              <TabsTrigger value="encrypt">Encrypt</TabsTrigger>
              <TabsTrigger value="decrypt">Decrypt</TabsTrigger>
            </TabsList>

            <TabsContent value="encrypt">
              <EncryptTab />
            </TabsContent>
            <TabsContent value="decrypt">
              <DecryptTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
