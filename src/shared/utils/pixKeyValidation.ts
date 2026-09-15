import {
  isBrazilMobilePhoneValid,
  isCpfValid,
  looksLikeBrazilMobilePhone,
  normalizeBrazilPhone,
} from './personalDataValidation'

export type PixKeyType = 'email' | 'cpf' | 'phone' | 'random'
export type PixKeyNumericType = Extract<PixKeyType, 'cpf' | 'phone'>

export interface PixKeyValidationResult {
  type: PixKeyType | null
  normalizedValue: string
  isValid: boolean
  errorMessage: string | null
  ambiguousTypes?: PixKeyNumericType[]
}

const emailErrorMessage = 'Insira um e-mail válido.'
const cpfIncompleteErrorMessage = 'Insira os 11 dígitos do CPF.'
const cpfInvalidErrorMessage = 'Insira um CPF válido.'
const phoneIncompleteErrorMessage = 'Insira o celular com DDD.'
const phoneInvalidErrorMessage = 'Insira um celular válido com DDD.'
const numericInvalidErrorMessage = 'Insira um CPF ou celular válido.'
const randomInvalidErrorMessage = 'Insira uma chave aleatória válida.'

const numericInputPattern = /^[\d\s()+.-]+$/
const randomCandidatePattern = /^[0-9a-z-]+$/i
const randomKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const emailLocalPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i
const emailDomainLabelPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i

const getDigits = (value: string) => value.replace(/\D/g, '')

export const getAmbiguousPixKeyTypes = (value: string): PixKeyNumericType[] => {
  const trimmedValue = value.trim()
  if (!numericInputPattern.test(trimmedValue)) return []

  const digits = getDigits(trimmedValue)
  if (
    digits.length !== 11
    || !isCpfValid(digits)
    || !isBrazilMobilePhoneValid(digits)
  ) return []

  return ['cpf', 'phone']
}

const validateEmail = (value: string): PixKeyValidationResult => {
  const normalizedValue = value.trim().toLowerCase()
  const parts = normalizedValue.split('@')
  const [local = '', domain = ''] = parts
  const domainLabels = domain.split('.')
  const topLevelDomain = domainLabels.at(-1) ?? ''
  const isValid = normalizedValue.length <= 77
    && parts.length === 2
    && local.length > 0
    && emailLocalPattern.test(local)
    && !local.startsWith('.')
    && !local.endsWith('.')
    && !local.includes('..')
    && domainLabels.length >= 2
    && domainLabels.every((label) => emailDomainLabelPattern.test(label))
    && /^[a-z]{2,63}$/i.test(topLevelDomain)

  return {
    type: 'email',
    normalizedValue,
    isValid,
    errorMessage: isValid ? null : emailErrorMessage,
  }
}

const validateRandomKey = (value: string): PixKeyValidationResult => {
  const normalizedValue = value.trim().toLowerCase()
  const isValid = randomKeyPattern.test(normalizedValue)

  return {
    type: 'random',
    normalizedValue,
    isValid,
    errorMessage: isValid ? null : randomInvalidErrorMessage,
  }
}

const validateCpf = (value: string): PixKeyValidationResult => {
  const normalizedValue = getDigits(value)
  const isComplete = normalizedValue.length === 11
  const isValid = isComplete && isCpfValid(normalizedValue)

  return {
    type: 'cpf',
    normalizedValue,
    isValid,
    errorMessage: isValid
      ? null
      : isComplete ? cpfInvalidErrorMessage : cpfIncompleteErrorMessage,
  }
}

const validatePhone = (value: string): PixKeyValidationResult => {
  const localNumber = normalizeBrazilPhone(value)
  const isComplete = localNumber.length === 11
  const isValid = isComplete && isBrazilMobilePhoneValid(localNumber)

  return {
    type: 'phone',
    normalizedValue: localNumber ? `+55${localNumber}` : '',
    isValid,
    errorMessage: isValid
      ? null
      : isComplete ? phoneInvalidErrorMessage : phoneIncompleteErrorMessage,
  }
}

const validateNumericKey = (
  value: string,
  numericTypeChoice: PixKeyNumericType | null,
): PixKeyValidationResult => {
  const digits = getDigits(value)
  const ambiguousTypes = getAmbiguousPixKeyTypes(value)

  if (ambiguousTypes.length === 2) {
    if (numericTypeChoice === 'cpf') return validateCpf(value)
    if (numericTypeChoice === 'phone') return validatePhone(value)

    return {
      type: null,
      normalizedValue: digits,
      isValid: false,
      errorMessage: null,
      ambiguousTypes,
    }
  }

  const hasPhoneFormatting = value.includes('+') || value.includes('(') || value.includes(')')
  const hasCpfFormatting = value.includes('.')
  const hasBrazilCountryCode = digits.startsWith('55') && digits.length > 11

  if (hasPhoneFormatting || hasBrazilCountryCode) return validatePhone(value)
  if (hasCpfFormatting) return validateCpf(value)

  if (digits.length === 11) {
    const cpfResult = validateCpf(digits)
    const phoneResult = validatePhone(digits)

    if (cpfResult.isValid) return cpfResult
    if (phoneResult.isValid) return phoneResult

    return looksLikeBrazilMobilePhone(digits) ? phoneResult : cpfResult
  }

  if (looksLikeBrazilMobilePhone(digits)) return validatePhone(digits)

  if (digits.length > 0 && digits.length < 11) {
    return {
      type: null,
      normalizedValue: digits,
      isValid: false,
      errorMessage: numericInvalidErrorMessage,
    }
  }

  return validateCpf(digits)
}

export const validatePixKey = (
  value: string,
  numericTypeChoice: PixKeyNumericType | null = null,
): PixKeyValidationResult => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return {
      type: null,
      normalizedValue: '',
      isValid: false,
      errorMessage: null,
    }
  }

  if (numericInputPattern.test(trimmedValue)) return validateNumericKey(trimmedValue, numericTypeChoice)

  if (trimmedValue.includes('-') && randomCandidatePattern.test(trimmedValue)) {
    return validateRandomKey(trimmedValue)
  }

  return validateEmail(trimmedValue)
}

const formatCpf = (value: string) => {
  const digits = getDigits(value).slice(0, 11)
  const firstGroup = digits.slice(0, 3)
  const secondGroup = digits.slice(3, 6)
  const thirdGroup = digits.slice(6, 9)
  const verifier = digits.slice(9, 11)

  return [firstGroup, secondGroup, thirdGroup]
    .filter(Boolean)
    .join('.')
    .concat(verifier ? `-${verifier}` : '')
}

const formatPhone = (value: string) => {
  const digits = normalizeBrazilPhone(value)
  const areaCode = digits.slice(0, 2)
  const firstGroup = digits.slice(2, 7)
  const secondGroup = digits.slice(7, 11)

  if (!digits) return ''
  if (digits.length <= 2) return `(${areaCode}`
  if (digits.length <= 7) return `(${areaCode}) ${firstGroup}`

  return `(${areaCode}) ${firstGroup}-${secondGroup}`
}

export const formatPixKeyInput = (
  value: string,
  numericTypeChoice: PixKeyNumericType | null = null,
) => {
  const trimmedValue = value.trimStart()

  if (!numericInputPattern.test(trimmedValue)) return value

  const digits = getDigits(trimmedValue)
  const ambiguousTypes = getAmbiguousPixKeyTypes(trimmedValue)

  if (ambiguousTypes.length === 2) {
    if (numericTypeChoice === 'cpf') return formatCpf(trimmedValue)
    if (numericTypeChoice === 'phone') return formatPhone(trimmedValue)
    return digits
  }

  const hasPhoneFormatting = trimmedValue.includes('+')
    || trimmedValue.includes('(')
    || trimmedValue.includes(')')
    || (digits.startsWith('55') && digits.length > 11)
  const hasCpfFormatting = trimmedValue.includes('.')

  if (hasPhoneFormatting) return formatPhone(trimmedValue)
  if (hasCpfFormatting) return formatCpf(trimmedValue)
  if (digits.length < 11) return digits
  if (digits.length > 11) return trimmedValue

  return validateNumericKey(digits, null).type === 'phone'
    ? formatPhone(digits)
    : formatCpf(digits)
}
