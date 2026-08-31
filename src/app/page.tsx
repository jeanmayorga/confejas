export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="flex w-full max-w-xl flex-col gap-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">Confejas</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          La base del proyecto está lista.
        </h1>
        <p className="text-pretty text-muted-foreground">
          Next.js, Bun y shadcn/ui quedaron configurados. El siguiente paso es
          conectar Neon y modelar participantes.
        </p>
      </section>
    </main>
  );
}
