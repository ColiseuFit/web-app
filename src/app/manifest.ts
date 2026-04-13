import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Coliseu Clube',
    short_name: 'Coliseu Clube',
    description: 'Plataforma exclusiva para membros do Coliseu. Acompanhe seus treinos, PRs e evolua na Arena.',
    start_url: '/login',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#E31B23',
    icons: [
      {
        src: '/favicon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/favicon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  }
}
