import { HTMLAttributes } from "react";

type DividerProps = HTMLAttributes<HTMLHRElement>;

export function Divider({ className = "", ...props }: DividerProps) {
  return (
    <hr className={`border-none h-px bg-border my-0 ${className}`} {...props} />
  );
}
