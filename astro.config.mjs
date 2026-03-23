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
      title: 'Reflection Network',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/reflection-network' },
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Getting started', slug: 'getting-started' },
            { label: 'Building containers', slug: 'building-containers' },
            { label: 'Adapters', slug: 'adapters' },
            { label: 'Dev launcher', slug: 'launcher' },
          ],
        },
      ],
    }),
  ],
});
