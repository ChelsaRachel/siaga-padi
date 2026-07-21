import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { ReactElement } from 'react'
import { Button } from './components/ui/button'

function App(): ReactElement {
  return (
    <div className="bg-bg-primary min-h-screen p-8">
      <h1 className="heading-1 mb-f4">FUSION</h1>

      <div className="flex flex-col gap-6 max-w-lg mt-f4">
        <Alert variant={"destructive"}>
          <AlertTitle>System Information</AlertTitle>
          <AlertDescription>
            Selamat datang di aplikasi FUSION. Pengaturan Dialog dan Alert telah berhasil di-load!
          </AlertDescription>
        </Alert>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant={"destructive"}>Buka Dialog Report</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Report FUSION</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin membuat laporan FUSION terbaru untuk sistem ini? 
                Aksi ini mungkin memakan waktu beberapa saat.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-fusion-neutral-500 mt-f2">Last updated: 17 April 2026</p>
    </div>
  )
}

export default App
