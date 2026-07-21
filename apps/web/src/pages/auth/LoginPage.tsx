import { Button } from '@/components/ui/button'
import { PaginationControl } from '@/components/ui/pagination-control'
import { useState } from 'react'

const TOTAL_DATA = 200
const PAGE_SIZE = 5

function LoginPage() {
  const [currentPage, setCurrentPage] = useState(0)

  const pageCount = Math.ceil(TOTAL_DATA / PAGE_SIZE)

  return (
    <>
      <div className="p-5">
        <div className="flex gap-5 mb-5">
          <Button size={'xs'}>Button CTA</Button>
          <Button size={'sm'}>Button CTA</Button>
          <Button size={'md'}>Button CTA</Button>
          <Button size={'lg'}>Button CTA</Button>
        </div>
        <div className="flex gap-5 mb-5">
          <Button size={'xs'} variant={'destructive'}>
            Button CTA
          </Button>
          <Button size={'sm'} variant={'destructive'}>
            Button CTA
          </Button>
          <Button size={'md'} variant={'destructive'}>
            Button CTA
          </Button>
          <Button size={'lg'} variant={'destructive'}>
            Button CTA
          </Button>
        </div>
        <div className="flex gap-5 mb-5">
          <Button size={'xs'} variant={'outline'}>
            Button CTA
          </Button>
          <Button size={'sm'} variant={'outline'}>
            Button CTA
          </Button>
          <Button size={'md'} variant={'outline'}>
            Button CTA
          </Button>
          <Button size={'lg'} variant={'outline'}>
            Button CTA
          </Button>
        </div>
        <div className="flex gap-5 mb-5">
          <Button size={'xs'} variant={'ghost'}>
            Button CTA
          </Button>
          <Button size={'sm'} variant={'ghost'}>
            Button CTA
          </Button>
          <Button size={'md'} variant={'ghost'}>
            Button CTA
          </Button>
          <Button size={'lg'} variant={'ghost'}>
            Button CTA
          </Button>
        </div>
        <div className="flex gap-5 mb-5">
          <Button size={'xs'} variant={'link'}>
            Button CTA
          </Button>
          <Button size={'sm'} variant={'link'}>
            Button CTA
          </Button>
          <Button size={'md'} variant={'link'}>
            Button CTA
          </Button>
          <Button size={'lg'} variant={'link'}>
            Button CTA
          </Button>
        </div>
      </div>

      <div className="p-5 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Halaman aktif: <span className="font-medium text-foreground">{currentPage + 1}</span> / {pageCount}
          &nbsp;(total {TOTAL_DATA} data, {PAGE_SIZE} per halaman)
        </p>
        <div>
          <PaginationControl
            pageCount={pageCount}
            forcePage={0}
            pageRangeDisplayed={3}
            marginPagesDisplayed={1}
            showFirstLast
            disableInitialCallback
            onPageChange={(selected) => setCurrentPage(selected)}
          />
        </div>
      </div>
    </>
  )
}

export default LoginPage
