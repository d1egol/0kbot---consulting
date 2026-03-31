import { ShrinkageForm } from '@/components/shrinkage/ShrinkageForm'
import { ShrinkageHistory } from '@/components/shrinkage/ShrinkageHistory'

export default function Shrinkage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Mermas</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <ShrinkageForm />
        <ShrinkageHistory />
      </div>
    </div>
  )
}
