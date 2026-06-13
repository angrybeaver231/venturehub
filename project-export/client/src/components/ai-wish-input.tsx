import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Wand2, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  /** Headline shown above the textarea — describe the surface. */
  title?: string;
  /** Sub-headline / placeholder hint. */
  hint?: string;
  /** Placeholder shown inside the textarea. */
  placeholder?: string;
  /** Primary CTA label. Default: "Generate" / "Сгенерировать". */
  actionLabel?: string;
  /** Suggested example prompts that fill the textarea on click. */
  examples?: string[];
  /** Loading state coming from the parent's mutation. */
  isPending?: boolean;
  /** Disable when parent has constraints (no startup picked, etc.). */
  disabled?: boolean;
  /** Called with the user's wish text. Parent runs the AI mutation. */
  onSubmit: (prompt: string) => void;
  /** Optional aside rendered under the input — explanation, errors, preview cards. */
  children?: React.ReactNode;
  /** Visual density. Compact omits the sparkle headline icon. */
  size?: "default" | "compact";
  testId?: string;
}

/**
 * Reusable "AI does it for you" wish input. The pattern is the same everywhere
 * across the Innovation / Capital surfaces: a friendly prompt box where the
 * user types what they want, the AI generates a draft, and the parent decides
 * what to do with the result (preview, save, refine).
 */
export function AiWishInput({
  title,
  hint,
  placeholder,
  actionLabel,
  examples = [],
  isPending = false,
  disabled = false,
  onSubmit,
  children,
  size = "default",
  testId = "ai-wish-input",
}: Props) {
  const { language } = useLanguage();
  const ru = language === "ru";
  const [text, setText] = useState("");

  const submit = () => {
    if (text.trim().length < 4) return;
    onSubmit(text.trim());
  };

  return (
    <div
      className="rounded-md border bg-primary/5 p-4 space-y-3"
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        {size === "default" && (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold" data-testid={`${testId}-title`}>
            {title ?? (ru ? "Просто опишите, что нужно" : "Just tell us what you want")}
          </h3>
          {hint && (
            <p className="text-xs text-muted-foreground mt-1" data-testid={`${testId}-hint`}>
              {hint}
            </p>
          )}
        </div>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          placeholder ??
          (ru
            ? "Например: предупреди меня, когда финтех-стартап поднимает раунд больше $1M"
            : "e.g. alert me when a fintech startup raises a round greater than $1M")
        }
        className="min-h-[88px] text-sm bg-background"
        disabled={disabled || isPending}
        data-testid={`${testId}-textarea`}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />

      {examples.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid={`${testId}-examples`}>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground self-center mr-1">
            {ru ? "Идеи:" : "Try:"}
          </span>
          {examples.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setText(ex)}
              disabled={disabled || isPending}
              className="text-xs rounded-full border bg-background px-2.5 py-1 hover-elevate active-elevate-2 disabled:opacity-50"
              data-testid={`${testId}-example-${i}`}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] text-muted-foreground">
          {ru ? "⌘/Ctrl + Enter — сгенерировать" : "⌘/Ctrl + Enter to generate"}
        </p>
        <Button
          size="sm"
          onClick={submit}
          disabled={disabled || isPending || text.trim().length < 4}
          data-testid={`${testId}-submit`}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
          )}
          {actionLabel ?? (ru ? "Сгенерировать" : "Generate")}
        </Button>
      </div>

      {children}
    </div>
  );
}
