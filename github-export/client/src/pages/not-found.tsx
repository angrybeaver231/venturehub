import { Link } from "wouter";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-5xl font-semibold">404</p>
      <p className="text-muted-foreground">This page does not exist.</p>
      <Link href="/">
        <a>
          <Button data-testid="button-home">Back to dashboard</Button>
        </a>
      </Link>
    </div>
  );
}
