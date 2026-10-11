import type { ReactNode } from 'react'

// Start: Define the title, optional supporting text, and controls for a shared section heading.
type SectionHeaderProps = {
  title: string
  id?: string
  description?: string
  headingLevel?: 'h2' | 'h3'
  children?: ReactNode
}
// End: Section header props.

function SectionHeader({ title, id, description, headingLevel = 'h3', children }: SectionHeaderProps) {
  // Start: Preserve the heading level used by each dashboard section.
  const Heading = headingLevel
  // End: Heading element selection.

  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-blue-200 bg-blue-100 px-4 py-3">
      {/* Start: Keep titles bold, supporting text smaller, and controls able to wrap on narrow screens. */}
      <div className="min-w-0 flex-1 basis-40">
        <Heading id={id} className={`font-semibold text-blue-950 ${headingLevel === 'h2' ? 'text-lg' : 'text-base'}`}>
          {title}
        </Heading>
        {description && <p className="mt-1 text-xs text-blue-800">{description}</p>}
      </div>
      {children}
      {/* End: Section title, supporting text, and optional controls. */}
    </div>
  )
}

export default SectionHeader
