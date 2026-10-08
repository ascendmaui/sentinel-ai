import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/brand";
import { posts } from "../lib/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date("2026-09-29"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: new Date("2026-09-29"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/incident-case-studies`,
      lastModified: new Date("2026-09-29"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date("2026-09-29"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/case-studies`,
      lastModified: new Date("2026-09-29"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  for (const post of posts) {
    routes.push({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return routes;
}
