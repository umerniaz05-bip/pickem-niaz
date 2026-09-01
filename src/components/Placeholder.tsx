export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <main className="flex flex-1 flex-col py-2">
      <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      <div className="flex flex-1 items-center justify-center">
        <p className="max-w-xs text-center text-sm text-zinc-500 dark:text-zinc-400">
          {note}
        </p>
      </div>
    </main>
  );
}
