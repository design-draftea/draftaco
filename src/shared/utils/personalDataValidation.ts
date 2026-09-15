const onlyDigits = (value: string) => value.replace(/\D/g, '')

const prototypeAllowedCpf = '11111111111'
const prototypeAllowedPhone = '11111111111'

export const brazilMobileAreaCodes = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
])

const getCpfCheckDigit = (baseDigits: string) => {
  const initialWeight = baseDigits.length + 1
  const sum = Array.from(baseDigits).reduce((total, digit, index) => (
    total + Number(digit) * (initialWeight - index)
  ), 0)
  const remainder = 11 - (sum % 11)

  return remainder >= 10 ? 0 : remainder
}

export const isCpfValid = (value: string) => {
  const digits = onlyDigits(value)

  if (digits.length !== 11) return false
  if (digits === prototypeAllowedCpf) return true
  if (/^(\d)\1{10}$/.test(digits)) return false

  const firstCheckDigit = getCpfCheckDigit(digits.slice(0, 9))
  const secondCheckDigit = getCpfCheckDigit(digits.slice(0, 10))

  return firstCheckDigit === Number(digits[9]) && secondCheckDigit === Number(digits[10])
}

export const normalizeBrazilPhone = (value: string) => {
  const digits = onlyDigits(value)

  if (digits.startsWith('55') && digits.length > 11) {
    return digits.slice(2, 13)
  }

  return digits.slice(0, 11)
}

const isSequentialDigits = (value: string) => {
  if (value.length < 4) return false

  return '01234567890123456789'.includes(value)
    || '98765432109876543210'.includes(value)
}

export const isBrazilMobilePhoneValid = (value: string) => {
  const digits = normalizeBrazilPhone(value)
  const areaCode = digits.slice(0, 2)
  const subscriberNumber = digits.slice(2)

  if (digits.length !== 11) return false
  if (digits === prototypeAllowedPhone) return true
  if (!brazilMobileAreaCodes.has(areaCode)) return false
  if (!subscriberNumber.startsWith('9')) return false
  if (/^(\d)\1{8}$/.test(subscriberNumber)) return false
  if (isSequentialDigits(subscriberNumber) || isSequentialDigits(subscriberNumber.slice(1))) return false

  return true
}

export const looksLikeBrazilMobilePhone = (value: string) => {
  const digits = normalizeBrazilPhone(value)

  return digits.length >= 3
    && brazilMobileAreaCodes.has(digits.slice(0, 2))
    && digits[2] === '9'
}
