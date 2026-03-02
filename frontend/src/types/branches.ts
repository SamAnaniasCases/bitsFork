export const BRANCHES = [
  'NRA',
  'TAYUD',
  'MAKATI',
] as const

export type Branch = {
  id: number
  name: string
}
