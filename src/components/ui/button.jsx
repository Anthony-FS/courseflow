import * as React from "react";
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium outline-none select-none transition-[background-color,border-color,color,box-shadow] duration-300 ease-out focus-visible:shadow-focus disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "ds-button ds-button--primary gap-2.5 rounded-[12px] border border-transparent bg-blue-500 px-8 py-[18px] text-body2 text-white shadow-button hover:bg-blue-400 active:bg-blue-700 disabled:bg-gray-400 disabled:text-gray-600 disabled:shadow-none",
        secondary:
          "ds-button ds-button--secondary gap-2.5 rounded-[12px] border border-orange-500 bg-white px-8 py-[18px] text-body2 text-orange-500 shadow-button hover:border-orange-100 hover:text-orange-100 active:border-orange-500 active:text-orange-500 disabled:border-gray-500 disabled:text-gray-500 disabled:shadow-none",
        ghost:
          "ds-button ds-button--ghost gap-2 rounded-2xl border-transparent bg-transparent px-2 py-1 text-body2 text-blue-500 shadow-none hover:bg-transparent hover:text-blue-400 active:text-blue-600 disabled:text-gray-500",
        outline:
          "rounded-[12px] border border-border bg-background px-8 py-[18px] text-body2 text-foreground hover:bg-muted",
        destructive:
          "rounded-[12px] border border-transparent bg-destructive/10 px-8 py-[18px] text-body2 text-destructive hover:bg-destructive/20",
        danger:
          "rounded-[12px] border border-transparent bg-red-500 px-8 py-[18px] text-body2 text-white shadow-button hover:bg-red-600 active:bg-red-700 disabled:bg-gray-400 disabled:text-gray-600 disabled:shadow-none",
        link: "text-blue-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[60px]",
        ghost: "min-h-8",
        sm: "min-h-9 gap-2 px-4 py-2 text-body3",
        lg: "min-h-[60px]",
        icon: "size-[60px] p-0",
        "icon-sm": "size-9 p-0",
      },
    },
    compoundVariants: [
      {
        variant: "ghost",
        size: "default",
        class: "min-h-8 px-2 py-1",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
