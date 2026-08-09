import { Link } from 'react-router-dom'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { PerfectScrollArea } from '@/components/wrappers/PerfectScrollArea'

interface ReferenceDrawerProps {
  refCodes: string[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Laci sumber rujukan — the reference codes behind one suggestion, each
 * linking to the read-only KB preview built in Sprint 04.
 *
 * It is a side sheet rather than an inline block on purpose: the brief says
 * the references must be reachable but must not dominate the screen. A farmer
 * reads the advice; the sources are one tap away when they want them.
 */
export function ReferenceDrawer({
  refCodes,
  isOpen,
  onOpenChange,
}: ReferenceDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80svh] rounded-t-3xl"
        data-testid="reference-drawer"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-h6 font-bold text-font-primary">
            Sumber rujukan
          </SheetTitle>
          <SheetDescription className="text-body-md text-font-secondary">
            Saran ini disusun dari panduan resmi berikut.
          </SheetDescription>
        </SheetHeader>

        <PerfectScrollArea className="mt-4 max-h-[55svh]">
          <ul className="flex flex-col gap-2 pr-2">
            {refCodes.map((refCode) => (
              <li key={refCode}>
                <Button
                  asChild
                  variant="outline"
                  className="h-auto w-full justify-between gap-3 rounded-2xl px-4 py-3 text-left"
                  data-testid={`reference-link-${refCode}`}
                >
                  <Link to={`/pengetahuan/rujukan/${refCode}`}>
                    <span className="flex min-w-0 items-center gap-2">
                      <i
                        className="ph ph-book-bookmark shrink-0 text-h6 text-primary-bold"
                        aria-hidden="true"
                      />
                      <span className="truncate font-mono text-body-md font-semibold">
                        {refCode}
                      </span>
                    </span>
                    <i className="ph ph-caret-right shrink-0" aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </PerfectScrollArea>
      </SheetContent>
    </Sheet>
  )
}

export default ReferenceDrawer
