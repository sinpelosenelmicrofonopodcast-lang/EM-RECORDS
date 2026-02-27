import Image from "next/image";
import { cn } from "@/lib/utils";

type EmLogoProps = {
  className?: string;
  priority?: boolean;
  alt?: string;
};

export function EmLogo({ className, priority = false, alt = "EM Records logo" }: EmLogoProps) {
  return (
    <Image
      src="/images/em-logo-white.svg"
      alt={alt}
      width={1200}
      height={520}
      priority={priority}
      className={cn("h-auto w-full object-contain", className)}
    />
  );
}
