/** Inline validation message under a form field (server fieldErrors keyed by path). */
export function FieldError({ errors, name }: { errors?: Record<string, string> | null; name: string }) {
  const msg = errors?.[name]
  if (!msg) return null
  return (
    <p className="mt-1 text-xs text-destructive" role="alert">
      {msg}
    </p>
  )
}
