"use client"

import { HTMLAttributes, ReactNode } from "react"
import { motion, Variants } from "framer-motion"

interface AnimatedSectionProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "header" | "footer"
  children: ReactNode
  delay?: number
  y?: number
  once?: boolean
  duration?: number
}

const defaultVariants = (y: number = 20): Variants => ({
  hidden: { opacity: 0, y },
  visible: { opacity: 1, y: 0 },
})

export function AnimatedSection({
  as = "div",
  children,
  className,
  delay = 0,
  y = 20,
  once = true,
  duration = 0.7,
  ...rest
}: AnimatedSectionProps) {
  const Component: any = motion[as] ?? motion.div
  return (
    <Component
      className={className}
      variants={defaultVariants(y)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-80px" }}
      transition={{ duration, ease: "easeOut", delay }}
      style={{ willChange: "transform, opacity" }}
      {...rest}
    >
      {children}
    </Component>
  )
}
