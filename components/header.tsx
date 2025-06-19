import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          RestoreClick
        </Link>
        <nav className="hidden md:flex space-x-6">
          <Link href="/our-story" className="hover:underline">
            Our Story
          </Link>
          <Link href="/faq" className="hover:underline">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center space-x-4">
          <Button asChild>
            <Link href="/">Restore Photos</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}