export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Authenticated workspace. Domain features are implemented in later phases.
      </p>
    </div>
  );
}
