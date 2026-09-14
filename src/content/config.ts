import { defineCollection, z } from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    categoryId: z.string().optional(),
    filename: z.string().optional(),
    refs_out: z.array(z.string()).default([]),
    refs_in: z.array(z.string()).default([]),
  }),
});

export const collections = {
  docs: docsCollection,
};
