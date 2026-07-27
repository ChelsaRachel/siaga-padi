function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/** Formats a Date as a `datetime-local` input value in LOCAL time. */
export function toDatetimeLocalValue(date: Date): string {
  return (
    `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}` +
    `T${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`
  )
}
