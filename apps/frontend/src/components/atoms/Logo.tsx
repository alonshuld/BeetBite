interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * The product mark. Decorative wherever it appears — it always sits beside the
 * "BeetBite" wordmark, so an alt text would only repeat what is already read
 * out. Served from `public/` so the same file backs the favicon.
 */
export function Logo({ size = 24, className = "" }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
    />
  );
}
