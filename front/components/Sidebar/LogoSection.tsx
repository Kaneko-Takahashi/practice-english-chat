import Link from "next/link";

export function LogoSection() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 px-4 py-4 transition-opacity hover:opacity-80"
      suppressHydrationWarning
      translate="no"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
        <span className="text-xl font-bold text-white">L</span>
      </div>
      <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-xl font-extrabold tracking-tight text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
        Lingo Leap
      </span>
    </Link>
  );
}
