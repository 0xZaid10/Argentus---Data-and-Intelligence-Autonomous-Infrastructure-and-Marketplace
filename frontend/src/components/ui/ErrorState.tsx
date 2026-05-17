import { AlertTriangle } from 'lucide-react'
import { Card } from './Card'

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.22),rgba(17,17,19,0.9))]" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-300" />
        <div>
          <p className="font-medium text-red-200">Unable to load data</p>
          <p className="mt-1 text-sm text-red-100/80">{message}</p>
        </div>
      </div>
    </Card>
  )
}
