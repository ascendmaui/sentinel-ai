import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "../lib/brand";
import { posts } from "../lib/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl();
  const routes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date("2026-09-29"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/pricing`,
      lastModified: new Date("2026-09-29"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/incident-case-studies`,
      lastModified: new Date("2026-09-29"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date("2026-09-29"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/case-studies`,
      lastModified: new Date("2026-09-29"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  for (const post of posts) {
    routes.push({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return routes;
}
