/**
 * Route contract tests: discovers every app/api/** /route.ts on disk and enforces the same
 * contract across all of them, so a newly added route cannot ship without coverage.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PUBLIC_CACHE, SECURITY_HEADERS } from "../lib/http";
import nextConfig from "../next.config.mjs";

const API_DIR = join(__dirname, "..", "app", "api");

function findRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...findRoutes(full));
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

/** "/api/posts/[slug]" style path for a route file. */
const toApiPath = (file: string) =>
  "/api/" + relative(API_DIR, file).split(sep).slice(0, -1).join("/");

/**
 * Every API route must be listed here. Adding a route file without registering it fails CI,
 * forcing an explicit decision about its cache policy and coverage.
 */
const REGISTRY: Record<string, { cache: string }> = {
  "/api/health": { cache: "no-store" },
  "/api/brand": { cache: PUBLIC_CACHE },
  "/api/posts": { cache: PUBLIC_CACHE },
  "/api/posts/[slug]": { cache: PUBLIC_CACHE },
  "/api/incidents": { cache: PUBLIC_CACHE },
  "/api/incidents/[id]": { cache: PUBLIC_CACHE },
  "/api/case-studies": { cache: PUBLIC_CACHE },
  "/api/case-studies/[id]": { cache: PUBLIC_CACHE },
  "/api/scenarios": { cache: PUBLIC_CACHE },
  "/api/scenarios/[id]": { cache: PUBLIC_CACHE },
  "/api/sources": { cache: PUBLIC_CACHE },
  "/api/sources/[id]": { cache: PUBLIC_CACHE },
  "/api/tiers": { cache: PUBLIC_CACHE },
  "/api/tiers/[id]": { cache: PUBLIC_CACHE },
};

const ALLOWED_EXPORTS = new Set(["GET", "dynamic", "dynamicParams", "generateStaticParams", "revalidate"]);
const MUTATING = ["POST", "PUT", "PATCH", "DELETE"];

type RouteModule = Record<string, unknown> & {
  GET: (req?: Request, ctx?: { params: Promise<Record<string, string>> }) => Response | Promise<Response>;
  generateStaticParams?: () => Record<string, string>[];
};

const files = findRoutes(API_DIR);
const routes = files.map((f) => ({ file: f, path: toApiPath(f) }));
const modules: Record<string, RouteModule> = {};

beforeAll(async () => {
  for (const r of routes) modules[r.path] = (await import(pathToFileURL(r.file).href)) as RouteModule;
});

afterEach(() => vi.unstubAllEnvs());

const paramName = (path: string) => /\[(\w+)\]$/.exec(path)?.[1];
const ctx = (key: string, value: string) => ({ params: Promise.resolve({ [key]: value }) });

function expectHardenedJson(res: Response, label: string) {
  expect(res.headers.get("content-type"), label).toBe("application/json; charset=utf-8");
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(res.headers.get(k), `${label} ${k}`).toBe(v);
}

describe("API route discovery", () => {
  it("finds route files on disk", () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it("every route on disk is registered, and every registered route exists", () => {
    expect(routes.map((r) => r.path).sort()).toEqual(Object.keys(REGISTRY).sort());
  });

  it("next.config.mjs enforces strict mode, disables X-Powered-By, and stays in sync with SECURITY_HEADERS", async () => {
    expect(nextConfig.reactStrictMode).toBe(true);
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(typeof nextConfig.headers).toBe("function");
    const headerRules = await nextConfig.headers!();
    expect(headerRules).toHaveLength(1);
    expect(headerRules[0].source).toBe("/:path*");
    expect(Object.fromEntries(headerRules[0].headers.map((h) => [h.key, h.value]))).toEqual(SECURITY_HEADERS);
  });
});

describe.each(routes.map((r) => [r.path] as const))("route contract %s", (path) => {
  it("exports a GET handler and only allowed route-segment exports", () => {
    const mod = modules[path];
    expect(typeof mod.GET).toBe("function");
    for (const key of Object.keys(mod)) expect(ALLOWED_EXPORTS.has(key), `${path} exports ${key}`).toBe(true);
    for (const m of MUTATING) expect(mod[m], `${path} must stay read-only (${m})`).toBeUndefined();
  });

  const key = paramName(path);

  if (!key) {
    it("responds 200 with hardened JSON and the registered cache policy (with and without a Request)", async () => {
      const mod = modules[path];
      for (const res of [await mod.GET(), await mod.GET(new Request(`http://localhost${path}`))]) {
        expect(res.status).toBe(200);
        expectHardenedJson(res, path);
        expect(res.headers.get("cache-control")).toBe(REGISTRY[path].cache);
        expect(await res.json()).toBeTypeOf("object");
      }
    });

    it("tolerates hostile query strings and supports relative request URLs without throwing", async () => {
      const mod = modules[path];
      const hostile = "?q=%00%ff&limit=1e9&limit=-1&tier=__proto__&year=" + "x".repeat(5000);
      const res = await mod.GET(new Request(`http://localhost${path}${hostile}`));
      expect(res.status).toBe(200);
      expectHardenedJson(res, path);

      const relRes = await mod.GET({ url: `${path}?limit=1` } as unknown as Request);
      expect(relRes.status).toBe(200);
      expectHardenedJson(relRes, `${path} relative url`);
      const relBody = await relRes.json();
      if ("count" in relBody && "totalCount" in relBody) {
        expect(relBody.count).toBe(1);
        expect(relBody.totalCount).toBeGreaterThanOrEqual(1);
      }

      const offsetRes = await mod.GET({ url: `${path}?offset=1&limit=1` } as unknown as Request);
      expect(offsetRes.status).toBe(200);
      expectHardenedJson(offsetRes, `${path} offset url`);
      const offsetBody = await offsetRes.json();
      if ("count" in offsetBody && "totalCount" in offsetBody) {
        expect(offsetBody.count).toBe(1);
        expect(offsetBody.totalCount).toBeGreaterThanOrEqual(1);
      }

      const takeSkipRes = await mod.GET({ url: `${path}?skip=1&take=1` } as unknown as Request);
      expect(takeSkipRes.status).toBe(200);
      expectHardenedJson(takeSkipRes, `${path} take/skip url`);
      const takeSkipBody = await takeSkipRes.json();
      if ("count" in takeSkipBody && "totalCount" in takeSkipBody) {
        expect(takeSkipBody.count).toBe(1);
        expect(takeSkipBody.totalCount).toBeGreaterThanOrEqual(1);
      }

      const pageRowsRes = await mod.GET({ url: `${path}?page=1&rows=1` } as unknown as Request);
      expect(pageRowsRes.status).toBe(200);
      expectHardenedJson(pageRowsRes, `${path} page/rows url`);
      const pageRowsBody = await pageRowsRes.json();
      if ("count" in pageRowsBody && "totalCount" in pageRowsBody) {
        expect(pageRowsBody.count).toBe(1);
        expect(pageRowsBody.totalCount).toBeGreaterThanOrEqual(1);
      }

      const pgRowsPerPageRes = await mod.GET({ url: `${path}?pg=1&rows_per_page=1` } as unknown as Request);
      expect(pgRowsPerPageRes.status).toBe(200);
      expectHardenedJson(pgRowsPerPageRes, `${path} pg/rows_per_page url`);
      const pgRowsPerPageBody = await pgRowsPerPageRes.json();
      if ("count" in pgRowsPerPageBody && "totalCount" in pgRowsPerPageBody) {
        expect(pgRowsPerPageBody.count).toBe(1);
        expect(pgRowsPerPageBody.totalCount).toBeGreaterThanOrEqual(1);
      }

      const pageIdxRowsPerPageRes = await mod.GET({ url: `${path}?page_idx=1&rowsPerPage=1` } as unknown as Request);
      expect(pageIdxRowsPerPageRes.status).toBe(200);
      expectHardenedJson(pageIdxRowsPerPageRes, `${path} page_idx/rowsPerPage url`);
      const pageIdxRowsPerPageBody = await pageIdxRowsPerPageRes.json();
      if ("count" in pageIdxRowsPerPageBody && "totalCount" in pageIdxRowsPerPageBody) {
        expect(pageIdxRowsPerPageBody.count).toBe(1);
        expect(pageIdxRowsPerPageBody.totalCount).toBeGreaterThanOrEqual(1);
      }

      const sortOrderRes = await mod.GET({ url: `${path}?sort_by=desc&orderBy=desc&order=latest` } as unknown as Request);
      expect(sortOrderRes.status).toBe(200);
      expectHardenedJson(sortOrderRes, `${path} sort/order url`);

      const sortDirectionRes = await mod.GET({ url: `${path}?order=forward&sort_dir=backward` } as unknown as Request);
      expect(sortDirectionRes.status).toBe(200);
      expectHardenedJson(sortDirectionRes, `${path} forward/backward sort url`);

      const sortNumericRes = await mod.GET({ url: `${path}?order=1&sort=-1` } as unknown as Request);
      expect(sortNumericRes.status).toBe(200);
      expectHardenedJson(sortNumericRes, `${path} numeric sort url`);

      const sortDirectionUpDownRes = await mod.GET({ url: `${path}?order=up&sort_direction=down&sortDirection=descend` } as unknown as Request);
      expect(sortDirectionUpDownRes.status).toBe(200);
      expectHardenedJson(sortDirectionUpDownRes, `${path} up/down/descend sort url`);

      const pageIdResultsRes = await mod.GET({ url: `${path}?page_id=1&results=1&start_idx=0&limit_count=1&skip_count=0` } as unknown as Request);
      expect(pageIdResultsRes.status).toBe(200);
      expectHardenedJson(pageIdResultsRes, `${path} page_id/results/start_idx url`);
      const pageIdResultsBody = await pageIdResultsRes.json();
      if ("count" in pageIdResultsBody && "totalCount" in pageIdResultsBody) {
        expect(pageIdResultsBody.count).toBe(1);
        expect(pageIdResultsBody.totalCount).toBeGreaterThanOrEqual(1);
      }

      const extendedAliasesRes = await mod.GET({ url: `${path}?ordering=newer&items=1&from_index=0&lookup=seraphim` } as unknown as Request);
      expect(extendedAliasesRes.status).toBe(200);
      expectHardenedJson(extendedAliasesRes, `${path} ordering/items/from_index/lookup url`);
      const extendedAliasesBody = await extendedAliasesRes.json();
      if ("count" in extendedAliasesBody && "totalCount" in extendedAliasesBody) {
        expect(extendedAliasesBody.count).toBeLessThanOrEqual(1);
      }

      const newAliasesRes = await mod.GET({ url: `${path}?records=1&from_idx=0&order_dir=asc&query_term=seraphim` } as unknown as Request);
      expect(newAliasesRes.status).toBe(200);
      expectHardenedJson(newAliasesRes, `${path} records/from_idx/order_dir/query_term url`);
      const newAliasesBody = await newAliasesRes.json();
      if ("count" in newAliasesBody && "totalCount" in newAliasesBody) {
        expect(newAliasesBody.count).toBeLessThanOrEqual(1);
      }
    });
  } else {
    it("is a dynamic route with generateStaticParams and dynamicParams enabled", () => {
      const mod = modules[path];
      expect(typeof mod.generateStaticParams).toBe("function");
      expect(mod.dynamicParams).toBe(true);
      const params = mod.generateStaticParams!();
      expect(params.length).toBeGreaterThan(0);
      for (const p of params) expect(typeof p[key]).toBe("string");
      expect(new Set(params.map((p) => p[key])).size).toBe(params.length);
    });

    it("every generated param resolves to 200 hardened JSON, case-insensitively, with surrounding whitespace, and with leading hash (#)", async () => {
      const mod = modules[path];
      for (const p of mod.generateStaticParams!()) {
        for (const value of [p[key], p[key].toUpperCase(), `  ${p[key]}  `, `#${p[key]}`]) {
          const res = await mod.GET(new Request(`http://localhost${path}`), ctx(key, value));
          expect(res.status, `${path} ${value}`).toBe(200);
          expectHardenedJson(res, `${path} ${value}`);
          expect(res.headers.get("cache-control")).toBe(REGISTRY[path].cache);
        }
      }
    });

    it.each([
      "does-not-exist",
      "",
      "   ",
      "__proto__",
      "constructor",
      "toString",
      "valueOf",
      "../health",
      "%00",
      undefined as unknown as string,
    ])(
      "unknown or hostile param %j -> JSON 404, not cacheable",
      async (value) => {
        const res = await modules[path].GET(new Request(`http://localhost${path}`), ctx(key, value));
        expect(res.status).toBe(404);
        expectHardenedJson(res, `${path} ${value}`);
        expect(res.headers.get("cache-control")).toBe("no-store");
        const body = await res.json();
        expect(body.error).toBe("not_found");
        expect(typeof body.message).toBe("string");
      }
    );

    it("returns a JSON 404 when route context or params is omitted", async () => {
      const noCtxRes = await modules[path].GET(new Request(`http://localhost${path}`));
      expect(noCtxRes.status).toBe(404);
      expectHardenedJson(noCtxRes, `${path} no ctx`);

      const noArgRes = await modules[path].GET();
      expect(noArgRes.status).toBe(404);
      expectHardenedJson(noArgRes, `${path} no args`);
    });
  }

  it("never echoes server-side environment values in the response body", async () => {
    const canary = "sentinel-canary-7f3a9c";
    for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "DATABASE_URL", "OPENAI_API_KEY"]) {
      vi.stubEnv(name, canary);
    }
    const mod = modules[path];
    const res = key
      ? await mod.GET(new Request(`http://localhost${path}`), ctx(key, mod.generateStaticParams!()[0][key]))
      : await mod.GET(new Request(`http://localhost${path}`));
    expect(await res.text()).not.toContain(canary);
  });
});

describe("CI & Repository Hardening Contracts", () => {
  const ROOT_DIR = join(__dirname, "..");

  it(".github/workflows/ci.yml enforces least-privilege permissions, credential non-persistence, ignore-scripts, and full verification steps", () => {
    const ciYaml = readFileSync(join(ROOT_DIR, ".github", "workflows", "ci.yml"), "utf8");
    expect(ciYaml).toContain("contents: read");
    expect(ciYaml).toContain("workflow_dispatch:");
    const checkoutCount = [...ciYaml.matchAll(/uses:\s*actions\/checkout@v4/g)].length;
    const persistFalseCount = [...ciYaml.matchAll(/persist-credentials:\s*false/g)].length;
    expect(checkoutCount).toBeGreaterThanOrEqual(2);
    expect(persistFalseCount).toBe(checkoutCount);

    const npmCiLines = [...ciYaml.matchAll(/run:\s*npm ci\b[^\n]*/g)].map((m) => m[0]);
    expect(npmCiLines.length).toBeGreaterThanOrEqual(2);
    for (const line of npmCiLines) {
      expect(line).toContain("--ignore-scripts");
    }

    expect(ciYaml).toContain("npm run typecheck");
    expect(ciYaml).toContain("npm test");
    expect(ciYaml).toContain("npm run build");
    expect(ciYaml).toContain("node scripts/smoke.mjs");
    expect(ciYaml).toContain("npm audit --omit=dev --audit-level=critical");
  });

  it(".github/dependabot.yml monitors both npm and github-actions ecosystems", () => {
    const dependabotYaml = readFileSync(join(ROOT_DIR, ".github", "dependabot.yml"), "utf8");
    expect(dependabotYaml).toContain("package-ecosystem: npm");
    expect(dependabotYaml).toContain("package-ecosystem: github-actions");
  });

  it("package.json has zero extra runtime dependencies and maps every test suite file to a test:* script", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT_DIR, "package.json"), "utf8")) as {
      private: boolean;
      dependencies: Record<string, string>;
      scripts: Record<string, string>;
    };
    expect(pkg.private).toBe(true);
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["next", "react", "react-dom"]);

    const testFiles = readdirSync(join(ROOT_DIR, "tests"))
      .filter((f) => f.endsWith(".test.ts"))
      .sort();
    const scriptCommands = Object.entries(pkg.scripts)
      .filter(([k]) => k.startsWith("test:"))
      .map(([, v]) => v);

    expect(scriptCommands.length).toBe(testFiles.length);
    for (const file of testFiles) {
      expect(
        scriptCommands.some((cmd) => cmd.includes(`tests/${file}`)),
        `tests/${file} missing from package.json test:* scripts`
      ).toBe(true);
      expect(existsSync(join(ROOT_DIR, "tests", file))).toBe(true);
    }
  });
});
