import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { userId } = auth();

  return (
    <header className="bg-slate-100 dark:bg-slate-900">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/">
          <span className="text-xl font-bold">Studio</span>
        </Link>
        <div>
          {userId ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}