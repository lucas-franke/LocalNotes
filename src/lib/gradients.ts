/** The fixed palette for generated note covers. Ids are stored in notes, so never reuse or rename one. */
export const COVER_GRADIENTS = [
  { id: 'sunset', name: 'Sunset', from: '#ff9966', to: '#ff5e62' },
  { id: 'sunrise', name: 'Sunrise', from: '#f6d365', to: '#fda085' },
  { id: 'rose', name: 'Rose', from: '#ee9ca7', to: '#ffdde1' },
  { id: 'lavender', name: 'Lavender', from: '#a18cd1', to: '#fbc2eb' },
  { id: 'orchid', name: 'Orchid', from: '#8e2de2', to: '#4a00e0' },
  { id: 'ocean', name: 'Ocean', from: '#2193b0', to: '#6dd5ed' },
  { id: 'lagoon', name: 'Lagoon', from: '#43cea2', to: '#185a9d' },
  { id: 'meadow', name: 'Meadow', from: '#d4fc79', to: '#96e6a1' },
  { id: 'slate', name: 'Slate', from: '#606c88', to: '#3f4c6b' },
  { id: 'midnight', name: 'Midnight', from: '#232526', to: '#414345' },
] as const

export type Gradient = (typeof COVER_GRADIENTS)[number]

const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** The gradient with this id; an unknown id (e.g. from a newer palette) falls back to one picked from the id text. */
export function gradientById(id: string): Gradient {
  return COVER_GRADIENTS.find((g) => g.id === id) ?? COVER_GRADIENTS[hash(id) % COVER_GRADIENTS.length]
}

/** The gradient a note gets until someone picks another cover: always the same one for the same note. */
export const defaultGradient = (noteId: string): Gradient => COVER_GRADIENTS[hash(noteId) % COVER_GRADIENTS.length]

export const gradientCss = (g: Gradient) => `linear-gradient(135deg, ${g.from}, ${g.to})`
