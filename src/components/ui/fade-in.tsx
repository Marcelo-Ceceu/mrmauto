import React from "react";
import { motion, HTMLMotionProps, Variants, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  fullWidth?: boolean;
}

const variants: Variants = {
  initial: (direction: string) => ({
    opacity: 0,
    x: direction === "left" ? 20 : direction === "right" ? -20 : 0,
    y: direction === "up" ? 20 : direction === "down" ? -20 : 0,
  }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  fullWidth = false,
  ...props
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-50px" }}
      custom={direction}
      variants={
        shouldReduceMotion ? { initial: { opacity: 0 }, animate: { opacity: 1 } } : variants
      }
      transition={{ delay }}
      className={cn(fullWidth ? "w-full" : "", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FadeInStagger({
  children,
  className,
  staggerDelay = 0.05,
  ...props
}: HTMLMotionProps<"div"> & { staggerDelay?: number }) {
  return (
    <motion.div
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
