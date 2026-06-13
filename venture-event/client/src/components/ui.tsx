import { forwardRef } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* --------------------------------- Button ---------------------------------- */

type ButtonVariant = "default" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:opacity-90",
  outline: "border border-border bg-transparent hover:bg-accent",
  ghost: "bg-transparent hover:bg-accent",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
};
const buttonSizes: Record<ButtonSize, string> = {
  default: "min-h-9 px-4 py-2",
  sm: "min-h-8 px-3 text-sm",
  icon: "h-9 w-9",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(({ className, variant = "default", size = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      buttonVariants[variant],
      buttonSizes[size],
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";

/* ---------------------------------- Card ----------------------------------- */

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold leading-tight", className)} {...props} />;
}

/* ---------------------------------- Badge ---------------------------------- */

type BadgeVariant = "default" | "secondary" | "outline";
const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-border text-foreground",
};
export function Badge({
  className,
  variant = "secondary",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------- Inputs & labels ------------------------------ */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";

export function Label({ className, ...props }: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

/* --------------------------------- Spinner --------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-muted-foreground", className)} />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24" data-testid="loader-page">
      <Spinner className="h-7 w-7" />
    </div>
  );
}
