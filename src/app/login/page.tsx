import { isAuthenticated } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { redirect } from "next/navigation";

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await isAuthenticated()) {
    redirect("/");
  }

  const searchParams = await props.searchParams;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="panel relative w-full max-w-lg p-8 md:p-10">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
          Courant Pty Ltd
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Transaction tracker login
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          One admin password unlocks the import workflow, review queue, audit trail,
          and provisional profit dashboard.
        </p>

        <form action="/api/login" className="mt-8 grid gap-4" method="post">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="password">
              Admin password
            </label>
            <input
              className="input"
              id="password"
              name="password"
              placeholder="Enter the password from ADMIN_PASSWORD"
              type="password"
            />
          </div>
          <button className="button-primary" type="submit">
            Sign in
          </button>
        </form>

        {error ? (
          <p className="mt-4 text-sm text-[var(--negative)]">
            {error === "invalid" ? "Password was incorrect." : "Unable to sign in."}
          </p>
        ) : null}
      </section>
    </main>
  );
}
