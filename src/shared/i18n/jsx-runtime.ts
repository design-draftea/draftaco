import { jsx as reactJsx, jsxs as reactJsxs } from 'react/jsx-runtime'
import { localizeProps } from './renderCopy'
export { Fragment } from 'react/jsx-runtime'
export type { JSX } from 'react/jsx-runtime'
export const jsx: typeof reactJsx = (type, props, key) => reactJsx(type, localizeProps(type, props), key)
export const jsxs: typeof reactJsxs = (type, props, key) => reactJsxs(type, localizeProps(type, props), key)
