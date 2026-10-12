import type { Metadata } from "next";
import { Mark } from "../../../components/Logo";

export const metadata: Metadata = { title: "Partner access", robots: { index: false, follow: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <main className="pk-login">
      <form method="post" action="/api/partners-login" className="pk-card">
        <Mark id="pk-login" size={96} />
        <h1>Partner marketing kit</h1>
        <p>Enter the shared partner password.</p>
        <input type="password" name="password" required autoFocus aria-label="Password" />
        {e ? <p className="pk-err">That password did not match.</p> : null}
        <button type="submit" className="btn btn-gold">Open the kit</button>
      </form>
    </main>
  );
}
