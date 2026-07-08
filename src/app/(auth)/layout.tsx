import Link from "next/link";
import { Logo } from "@/components/shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex h-16 items-center px-6"><Link href="/"><Logo /></Link></header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <p className="pb-6 text-center text-xs text-ink-faint">
        entiquity does not provide legal advice.
      </p>
    </div>
  );
}
