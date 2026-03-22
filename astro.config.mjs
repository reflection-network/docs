import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  vite: {
    ssr: {
      noExternal: ['zod'],
    },
  },
  integrations: [
    starlight({
      title: 'Reflection',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/reflection-network' },
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Getting started', slug: 'getting-started' },
          ],
        },
      ],
    }),
  ],
});
