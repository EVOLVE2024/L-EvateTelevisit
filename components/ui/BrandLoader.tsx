import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
};

const ringSize: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20",
};

const borderSize: Record<NonNullable<Props["size"]>, string> = {
  sm: "border-[2px]",
  md: "border-[3px]",
  lg: "border-[4px]",
};

export function BrandLoader({
  className,
  title = "Preparing your scheduler",
  subtitle = "Checking your onboarding status…",
  size = "md",
}: Props) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-5",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn("relative", ringSize[size])}>
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full border-[#e3ecf7]",
            borderSize[size]
          )}
        />
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 animate-spin rounded-full border-transparent border-t-[#0a51b7] border-r-[#0a51b7]",
            borderSize[size]
          )}
          style={{ animationDuration: "0.9s" }}
        />
        <span
          aria-hidden
          className="absolute inset-[26%] rounded-full bg-gradient-to-br from-[#0a51b7] to-[#1278d9] shadow-[0_6px_16px_-6px_rgba(10,81,183,0.65)]"
          style={{
            animation: "brandloader-pulse 1.6s ease-in-out infinite",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, rgba(10,81,183,0.14), transparent 65%)",
            animation: "brandloader-halo 1.6s ease-in-out infinite",
          }}
        />
      </div>
      {(title || subtitle) && (
        <div className="text-center">
          {title && (
            <p className="text-sm font-semibold tracking-tight text-[#111a26]">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="mt-1 text-xs text-[#6f7e8e]">{subtitle}</p>
          )}
        </div>
      )}
      <span className="sr-only">{title ?? "Loading"}</span>
      <style>{`
        @keyframes brandloader-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.8; }
          50%      { transform: scale(1.05); opacity: 1; }
        }
        @keyframes brandloader-halo {
          0%, 100% { transform: scale(0.9); opacity: 0.45; }
          50%      { transform: scale(1.2); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
