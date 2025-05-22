// app/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EncryptTab from "@/components/EncryptTab"
import DecryptTab from "@/components/DecryptTab"

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Tabs defaultValue="encrypt" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
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
    </main>
  )
}
