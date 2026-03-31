import { ShrinkageForm } from '@/components/shrinkage/ShrinkageForm'
import { ShrinkageHistory } from '@/components/shrinkage/ShrinkageHistory'

export default function Shrinkage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Mermas</h1>

      {/* Desktop: two columns */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-2">
        <ShrinkageForm />
        <ShrinkageHistory />
      </div>

      {/* Mobile: form sticky top, history below */}
      <div className="lg:hidden">
        <div className="sticky top-[57px] z-30 -mx-4 max-h-[50vh] overflow-y-auto bg-primary-50 px-4 pb-2">
          <ShrinkageForm />
        </div>
        <div className="mt-3">
          <ShrinkageHistory />
        </div>
      </div>
    </div>
  )
}
