import type { ComponentProps, ReactNode } from 'react'

export const rowClass = 'flex flex-wrap items-center gap-2.5'

export const fieldClass =
  'rounded-[9px] border border-border bg-surface-2 px-3 py-[9px] text-[0.92rem] text-fg'

export const monoBoxClass =
  'rounded-[9px] bg-surface-2 px-3.5 py-3 font-mono text-[0.8rem] whitespace-pre-wrap text-fg-dim'

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-[18px] rounded-[14px] border border-border bg-surface px-5 py-[18px]">
      <h2 className="mb-3.5 text-[0.78rem] font-semibold tracking-[0.06em] text-fg-dim uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

type ButtonProps = ComponentProps<'button'> & { variant?: 'primary' | 'secondary' }

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const look =
    variant === 'primary'
      ? 'border-transparent bg-accent text-white'
      : 'border-border bg-surface-2 text-fg'
  return (
    <button
      type="button"
      className={`cursor-pointer rounded-[9px] border px-3 py-[9px] text-[0.92rem] font-semibold transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-40 ${look} ${className}`}
      {...props}
    />
  )
}

export function Note({ className = '', children }: { className?: string; children: ReactNode }) {
  return <p className={`text-[0.78rem] leading-[1.6] text-fg-dim ${className}`}>{children}</p>
}
