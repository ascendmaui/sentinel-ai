/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The gated partner page reads kit docs and the post list from disk at request time.
  outputFileTracingIncludes: {
    "/marketing-kit": ["./public/partners-kit/docs/**", "./public/partners-kit/social/posts.json", "./public/partners-kit/**/*.{svg,png,jpg}"],
  },
};

export default nextConfig;
