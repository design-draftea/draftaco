import { createElement as reactCreateElement, type ElementType, type ReactNode } from 'react'
import { localizeProps } from './renderCopy'

// JSX with spread props before `key` uses React's createElement fallback.
export function createElement(type: ElementType, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  const merged = children.length ? { ...props, children: children.length === 1 ? children[0] : children } : props
  return reactCreateElement(type, localizeProps(type, merged) as Record<string, unknown> | null)
}
