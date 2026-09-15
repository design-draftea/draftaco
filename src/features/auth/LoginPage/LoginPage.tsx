import { useCallback, useEffect, useMemo, useRef, useState, type AnimationEvent, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import backHeaderIcon from '../../../assets/iconsDraftaco/backHeader.svg'
import closeBSIcon from '../../../assets/iconsDraftaco/closeBS.svg'
import iconApple from '../../../assets/iconsDraftaco/iconApple.svg'
import iconBiometria from '../../../assets/iconsDraftaco/iconBiometria.svg'
import iconCPF from '../../../assets/iconsDraftaco/iconCPF.svg'
import iconEmail from '../../../assets/iconsDraftaco/iconEmail.svg'
import iconError from '../../../assets/iconsDraftaco/iconError.svg'
import iconEye from '../../../assets/iconsDraftaco/iconEye.svg'
import iconEyeHide from '../../../assets/iconsDraftaco/iconEyeHide.svg'
import iconGoogle from '../../../assets/iconsDraftaco/iconGoogle.svg'
import iconClock from '../../../assets/iconsDraftaco/iconClock.svg'
import iconOferta from '../../../assets/iconsDraftaco/iconOferta.svg'
import iconLimiteJogoDiario from '../../../assets/iconsDraftaco/iconLimiteJogoDiario.svg'
import iconLimitePerdaDiario from '../../../assets/iconsDraftaco/iconLimitePerdaDiario.svg'
import iconLocalizacao from '../../../assets/iconsDraftaco/iconLocalizacao.png'
import ilustraModalAtencao from '../../../assets/iconsDraftaco/ilustraModalAtencao.svg'
import iconPass from '../../../assets/iconsDraftaco/iconPass.svg'
import iconSenhaCorreta from '../../../assets/iconsDraftaco/iconSenhaCorreta.svg'
import iconSenhaDefault from '../../../assets/iconsDraftaco/iconSenhaDefault.svg'
import iconSenhaErro from '../../../assets/iconsDraftaco/iconSenhaErro.svg'
import iconSuporte from '../../../assets/iconsDraftaco/iconSuporte.svg'
import glowGarantidaCadastro01 from '../../../assets/iconsDraftaco/glowGarantidaCadastro01.png'
import glowGarantidaCadastro02 from '../../../assets/iconsDraftaco/glowGarantidaCadastro02.png'
import imgLewandowskiPromo from '../../../assets/iconsDraftaco/imgLewandowskiPromo.png'
import imgVerificaIdentidadeBorda from '../../../assets/iconsDraftaco/imgVerificaIdentidadeBorda.png'
import imgVerificaIdentidadeLogo from '../../../assets/iconsDraftaco/imgVerificaIdentidadeLogo.png'
import logoUnico from '../../../assets/iconsDraftaco/logoUnico.png'
import flagBrasil from '../../../assets/iconPaises/brasil.png'
import { BottomSheet } from '../../../components/BottomSheet'
import {
  FacialVerificationCapture,
  IdentityVerificationLoading,
} from '../../../components/IdentityVerification'
import { useStableKeyboardViewport } from '../../../shared/hooks/useStableKeyboardViewport'
import { useTapFocusScrollGuard } from '../../../shared/hooks/useTapFocusScrollGuard'
import { useTouchScrollFence } from '../../../shared/hooks/useTouchScrollFence'
import {
  PROMO_COUNTDOWN_TICK_MS,
  formatPromoCountdownSegment,
  getGarantidaPromoDeadline,
  getPromoCountdownParts,
  type PromoCountdownParts,
} from '../../../shared/utils/garantidaPromoCountdown'
import {
  isBrazilMobilePhoneValid,
  isCpfValid,
  normalizeBrazilPhone,
} from '../../../shared/utils/personalDataValidation'
import './LoginPage.css'

type AuthMode = 'login' | 'signup'
type LoginMotionState = 'entering' | 'open' | 'exiting'
type LoginSubmitMethod = 'email' | 'google' | 'apple'
type SignupStep = 'account' | 'personal' | 'address' | 'verification'
type AddressStage = 'cep' | 'details'
type SignupStepMotionPhase = 'idle' | 'entering' | 'exiting'
type SignupLoadingAction = 'personal' | 'phone-validation' | 'address' | 'verification-start' | 'limits-save' | 'custom-limit'
type AddressLookupStatus = 'idle' | 'loading' | 'success' | 'not-found' | 'error'
type VerificationStage = 'intro' | 'document-front' | 'document-back' | 'face' | 'loading' | 'limits'
type VerificationCaptureStage = Extract<VerificationStage, 'document-front' | 'document-back' | 'face'>
type VerificationCameraStatus = 'idle' | 'loading' | 'ready' | 'unavailable'
type LimitCustomSheetType = 'time' | 'loss'
type SignupExitRequirement = 'identity' | 'limits'

interface LoginPageProps {
  mode?: AuthMode
  motionState?: LoginMotionState
  overlayVariant?: 'default' | 'over-betslip'
  onBack?: () => void
  onCreateAccountClick?: () => void
  onDepositOpen?: () => void
  onEnterComplete?: () => void
  onIdentityExit?: () => void
  onIdentityVerificationStart?: () => void
  onLoginClick?: () => void
  onLoginSuccess?: () => void
  onLimitsExit?: () => void
  resumeSignupIdentity?: boolean
  resumeSignupLimits?: boolean
  showSignupGarantidaBanner?: boolean
}

interface LoginInputProps {
  id: string
  label: string
  icon?: string
  placeholder: string
  value: string
  type?: 'email' | 'text' | 'password' | 'tel'
  autoComplete?: string
  describedBy?: string
  errorMessage?: string
  inputMode?: 'email' | 'numeric' | 'tel' | 'text'
  isInvalid?: boolean
  isPasswordField?: boolean
  maxLength?: number
  preventScrollOnFocus?: boolean
  readOnly?: boolean
  trailingAction?: ReactNode
  onBlur?: () => void
  onChange: (value: string) => void
  onFocus?: () => void
}

interface AddressSelectProps {
  id: string
  label: string
  placeholder: string
  value: string
  disabled?: boolean
  isOpen: boolean
  onOpen: () => void
}

interface PrimaryButtonProps {
  children: ReactNode
  disabled?: boolean
  isLoading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
}

interface ViaCepResponse {
  erro?: boolean
  bairro?: string
  localidade?: string
  logradouro?: string
  uf?: string
}

interface IbgeCityResponse {
  nome?: string
}

const loginEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const loginEmailErrorMessage = 'Insira um e-mail válido'
const cpfIncompleteErrorMessage = 'Insira os 11 dígitos do CPF'
const cpfInvalidErrorMessage = 'Insira um CPF válido'
const phoneIncompleteErrorMessage = 'Insira o celular com DDD'
const phoneInvalidErrorMessage = 'Insira um celular válido com DDD'
const cepLookupErrorMessage = 'Verifique o CEP e tente novamente'
const cityLookupErrorMessage = 'Não foi possível carregar as cidades'
const correiosCepSearchUrl = 'https://buscacepinter.correios.com.br/app/localidade_logradouro/index.php'
const signupSteps: SignupStep[] = ['account', 'personal', 'address']
const phoneValidationCodeLength = 6
const phoneValidationCountdownStart = 30
const primaryButtonLoadingDurationMs = 1500
const authSubmitLoadingDurationMs = primaryButtonLoadingDurationMs
const loginPageMotionDurationMs = 320
const signupStepExitDurationMs = 140
const signupStepEnterDurationMs = 220
const verificationLoadingDurationMs = 1500
const verificationFadeDurationMs = 180
const mobileCameraMediaQuery = '(hover: none) and (pointer: coarse)'
const verificationCaptureScreens: Record<VerificationCaptureStage, {
  title: string
  eyebrow: string
  cameraFacingMode: 'environment' | 'user'
  ariaLabel: string
}> = {
  'document-front': {
    title: 'Frente do documento',
    eyebrow: 'Centralize seu documento na moldura',
    cameraFacingMode: 'environment',
    ariaLabel: 'Capturar frente do documento',
  },
  'document-back': {
    title: 'Verso do documento',
    eyebrow: 'Centralize seu documento na moldura',
    cameraFacingMode: 'environment',
    ariaLabel: 'Capturar verso do documento',
  },
  face: {
    title: 'Verificação facial',
    eyebrow: 'Centralize seu rosto na moldura',
    cameraFacingMode: 'user',
    ariaLabel: 'Validar rosto',
  },
}
const verificationNextStageByCapture: Record<VerificationCaptureStage, VerificationStage> = {
  'document-front': 'document-back',
  'document-back': 'face',
  face: 'limits',
}
const verificationCameraErrorMessageByName: Record<string, string> = {
  NotAllowedError: 'Libere a câmera nas configurações do navegador.',
  NotFoundError: 'Use um dispositivo com câmera compatível.',
  OverconstrainedError: 'Use um dispositivo com câmera compatível.',
  SecurityError: 'Abra o app em HTTPS para ativar a câmera no celular.',
}
const gameTimeLimitOptions = ['1 hora', '2 horas', '5 horas', '12 horas', '24 horas', 'Outro']
const lossLimitOptions = ['R$ 1.000', 'R$ 10.000', 'R$ 100.000', 'R$ 1.000.000', 'Outro']
const customLimitOption = 'Outro'
const brazilRegionOptions = [
  { uf: 'AC', label: 'Acre' },
  { uf: 'AL', label: 'Alagoas' },
  { uf: 'AP', label: 'Amapa' },
  { uf: 'AM', label: 'Amazonas' },
  { uf: 'BA', label: 'Bahía' },
  { uf: 'CE', label: 'Ceara' },
  { uf: 'DF', label: 'Distrito Federal' },
  { uf: 'ES', label: 'Espirito Santo' },
  { uf: 'GO', label: 'Goias' },
  { uf: 'MA', label: 'Maranhao' },
  { uf: 'MT', label: 'Mato Grosso' },
  { uf: 'MS', label: 'Mato Grosso do Sul' },
  { uf: 'MG', label: 'Minas Gerais' },
  { uf: 'PA', label: 'Para' },
  { uf: 'PB', label: 'Paraiba' },
  { uf: 'PR', label: 'Paraná' },
  { uf: 'PE', label: 'Pernambuco' },
  { uf: 'PI', label: 'Piaui' },
  { uf: 'RJ', label: 'Río de Janeiro' },
  { uf: 'RN', label: 'Río Grande do Norte' },
  { uf: 'RS', label: 'Río Grande do Sul' },
  { uf: 'RO', label: 'Rondonia' },
  { uf: 'RR', label: 'Roraima' },
  { uf: 'SC', label: 'Santa Catarina' },
  { uf: 'SP', label: 'São Paulo' },
  { uf: 'SE', label: 'Sergipe' },
  { uf: 'TO', label: 'Tocantins' },
]
const onlyDigits = (value: string) => value.replace(/\D/g, '')

const formatCurrencyLimitInput = (value: string) => {
  const digits = onlyDigits(value).slice(0, 12)

  if (!digits) return ''

  return (Number(digits) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const parseCurrencyLimitCents = (value: string) => Number(onlyDigits(value))

const normalizeTimeLimitHoursInput = (value: string) => {
  const digits = onlyDigits(value)

  if (!digits) return ''

  const numericValue = Number(digits)

  return String(Math.min(numericValue, 24))
}

const normalizeTimeLimitMinutesInput = (value: string) => {
  const digits = onlyDigits(value)

  if (!digits) return ''

  const numericValue = Number(digits)

  return String(Math.min(numericValue, 60))
}

const getTimeLimitTotalMinutes = (hours: string, minutes: string) => {
  const hoursValue = Number(hours || 0)
  const minutesValue = hoursValue >= 24 ? 0 : Number(minutes || 0)

  return (hoursValue * 60) + minutesValue
}

const isCustomTimeLimitValid = (hours: string, minutes: string) => {
  const hoursValue = Number(hours || 0)
  const minutesValue = Number(minutes || 0)
  const totalMinutes = getTimeLimitTotalMinutes(hours, minutes)

  return hoursValue >= 0
    && hoursValue <= 24
    && minutesValue >= 0
    && minutesValue <= 60
    && totalMinutes > 0
    && totalMinutes <= 24 * 60
}

const getBrazilRegionOptionByUf = (uf?: string) => {
  if (!uf) return undefined

  const normalizedUf = uf.toUpperCase()

  return brazilRegionOptions.find((option) => option.uf === normalizedUf)
}

const normalizeBrazilText = (value: string) => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
)

const getCanonicalCityOption = (cityOptions: string[], cityName: string) => {
  const normalizedCityName = normalizeBrazilText(cityName)

  if (!normalizedCityName) return ''

  return cityOptions.find((option) => normalizeBrazilText(option) === normalizedCityName) ?? ''
}

const getCountdownAriaLabel = ({ hours, minutes }: PromoCountdownParts) => (
  `Promoção termina em ${hours} ${hours === 1 ? 'hora' : 'horas'} e ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
)

const getEmailErrorMessage = (value: string) => {
  const normalizedValue = value.trim()

  if (!normalizedValue) return null

  return loginEmailPattern.test(normalizedValue) ? null : loginEmailErrorMessage
}

const signupPasswordRequirements = [
  {
    id: 'length',
    label: '8 caracteres',
    isMet: (value: string) => value.length >= 8,
  },
  {
    id: 'uppercase',
    label: '1 letra maiúscula',
    isMet: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: 'number',
    label: '1 número',
    isMet: (value: string) => /\d/.test(value),
  },
  {
    id: 'special',
    label: '1 caractere especial',
    isMet: (value: string) => /[^A-Za-z0-9\s]/.test(value),
  },
]

const isSignupPasswordValid = (value: string) => (
  signupPasswordRequirements.every(({ isMet }) => isMet(value))
)

// CEP de teste liberado para o protótipo, com endereço completo de exemplo.
const prototypeAllowedCep = '11111111'
const prototypeAllowedAddress = {
  region: 'São Paulo',
  regionUf: 'SP',
  city: 'São Paulo',
  neighborhood: 'Centro',
  street: 'Avenida Paulista',
}

const getCpfErrorMessage = (value: string) => {
  const digits = onlyDigits(value)

  if (!digits) return null
  if (digits.length !== 11) return cpfIncompleteErrorMessage

  return isCpfValid(digits) ? null : cpfInvalidErrorMessage
}

const getPhoneErrorMessage = (value: string) => {
  const digits = normalizeBrazilPhone(value)

  if (!digits) return null
  if (digits.length !== 11) return phoneIncompleteErrorMessage

  return isBrazilMobilePhoneValid(digits) ? null : phoneInvalidErrorMessage
}

const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11)
  const firstGroup = digits.slice(0, 3)
  const secondGroup = digits.slice(3, 6)
  const thirdGroup = digits.slice(6, 9)
  const verifier = digits.slice(9, 11)

  return [
    firstGroup,
    secondGroup,
    thirdGroup,
  ].filter(Boolean).join('.').concat(verifier ? `-${verifier}` : '')
}

const formatCep = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8)
  const firstGroup = digits.slice(0, 5)
  const secondGroup = digits.slice(5, 8)

  return secondGroup ? `${firstGroup}-${secondGroup}` : firstGroup
}

const formatBrazilPhone = (value: string) => {
  const digits = normalizeBrazilPhone(value)
  const areaCode = digits.slice(0, 2)
  const firstGroup = digits.slice(2, 7)
  const secondGroup = digits.slice(7, 11)

  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${areaCode}`
  if (digits.length <= 7) return `(${areaCode}) ${firstGroup}`

  return `(${areaCode}) ${firstGroup}-${secondGroup}`
}

const formatBrazilPhoneForValidation = (value: string) => {
  const digits = normalizeBrazilPhone(value)
  const areaCode = digits.slice(0, 2)
  const firstGroup = digits.slice(2, 7)
  const secondGroup = digits.slice(7, 11)

  return `+55 ${areaCode} ${firstGroup}-${secondGroup}`
}

const focusPhoneValidationInput = () => {
  const input = document.getElementById('signup-phone-validation-code')
  const scrollX = window.scrollX
  const scrollY = window.scrollY

  input?.focus({ preventScroll: true })

  if (input instanceof HTMLInputElement) {
    input.setSelectionRange(input.value.length, input.value.length)
  }

  window.scrollTo(scrollX, scrollY)
}

function LoginInput({
  id,
  label,
  icon,
  placeholder,
  value,
  type = 'text',
  autoComplete,
  describedBy,
  errorMessage,
  inputMode,
  isInvalid = false,
  isPasswordField = false,
  maxLength,
  preventScrollOnFocus = false,
  readOnly = false,
  trailingAction,
  onBlur,
  onChange,
  onFocus,
}: LoginInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isFilled = value.length > 0
  const shouldDisableTextAssist = isPasswordField || type === 'password'
  const errorId = `${id}-error`
  const ariaDescribedBy = [
    describedBy,
    isInvalid && errorMessage ? errorId : '',
  ].filter(Boolean).join(' ') || undefined

  const {
    handleFieldPointerDown,
    handleFieldPointerUp,
    handleFieldPointerCancel,
    handleFocus,
  } = useTapFocusScrollGuard({
    inputRef,
    isEnabled: preventScrollOnFocus && !readOnly,
    onFocus,
  })

  return (
    <label
      className={[
        'login-input',
        isFilled ? 'login-input--filled' : '',
        isInvalid ? 'login-input--error' : '',
        readOnly ? 'login-input--readonly' : '',
      ].filter(Boolean).join(' ')}
      htmlFor={id}
    >
      <span className="login-input__label">{label}</span>
      <span
        className="login-input__container"
        onPointerDown={handleFieldPointerDown}
        onPointerUp={handleFieldPointerUp}
        onPointerCancel={handleFieldPointerCancel}
      >
        <span className="login-input__content">
          {icon ? <img src={icon} alt="" className="login-input__icon" aria-hidden="true" /> : null}
          <input
            ref={inputRef}
            id={id}
            className="login-input__field"
            type={type}
            value={value}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            maxLength={maxLength}
            readOnly={readOnly}
            autoCapitalize={shouldDisableTextAssist ? 'none' : undefined}
            autoCorrect={shouldDisableTextAssist ? 'off' : undefined}
            spellCheck={shouldDisableTextAssist ? false : undefined}
            aria-describedby={ariaDescribedBy}
            aria-invalid={isInvalid || undefined}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            onFocus={handleFocus}
          />
        </span>
        {isInvalid && !trailingAction ? (
          <img src={iconError} alt="" className="login-input__error-icon" aria-hidden="true" />
        ) : trailingAction}
      </span>
      {isInvalid && errorMessage ? (
        <span className="login-input__error-message" id={errorId}>{errorMessage}</span>
      ) : null}
    </label>
  )
}

function SignupPasswordRequirements({
  password,
  showInvalidRequirements,
}: {
  password: string
  showInvalidRequirements: boolean
}) {
  const requirementColumns = [
    signupPasswordRequirements.slice(0, 2),
    signupPasswordRequirements.slice(2),
  ]

  return (
    <div className="login-password-rules" id="signup-password-rules">
      <p className="login-password-rules__title">Sua senha deve ter pelo menos:</p>
      <div className="login-password-rules__grid" role="list">
        {requirementColumns.map((column, columnIndex) => (
          <div className="login-password-rules__column" key={columnIndex}>
            {column.map(({ id, label, isMet }) => {
              const isRequirementMet = isMet(password)
              const state = isRequirementMet
                ? 'valid'
                : showInvalidRequirements
                  ? 'invalid'
                  : 'default'
              const icon = state === 'valid'
                ? iconSenhaCorreta
                : state === 'invalid'
                  ? iconSenhaErro
                  : iconSenhaDefault

              return (
                <div
                  className={[
                    'login-password-rules__item',
                    `login-password-rules__item--${state}`,
                  ].join(' ')}
                  key={id}
                  role="listitem"
                >
                  <img src={icon} alt="" className="login-password-rules__icon" aria-hidden="true" />
                  <span>{label}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function AddressSelect({
  id,
  label,
  placeholder,
  value,
  disabled = false,
  isOpen,
  onOpen,
}: AddressSelectProps) {
  const labelId = `${id}-label`
  const isFilled = value.length > 0

  return (
    <div
      className={[
        'login-input',
        'login-input--select',
        isFilled ? 'login-input--filled' : '',
      ].filter(Boolean).join(' ')}
    >
      <span className="login-input__label" id={labelId}>{label}</span>
      <button
        id={id}
        type="button"
        className="login-input__container login-input__select-button"
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={onOpen}
      >
        <span className="login-input__content">
          <span
            className={[
              'login-input__field',
              'login-input__select-value',
              !isFilled ? 'login-input__select-value--placeholder' : '',
            ].filter(Boolean).join(' ')}
          >
            {isFilled ? value : placeholder}
          </span>
        </span>
        <span className="login-input__select-icon" aria-hidden="true" />
      </button>
    </div>
  )
}

function PrimaryButton({
  children,
  disabled = false,
  isLoading = false,
  onClick,
  type = 'button',
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={[
        'login-page__submit',
        !disabled || isLoading ? 'login-page__submit--active' : '',
        isLoading ? 'login-page__submit--loading' : '',
      ].filter(Boolean).join(' ')}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      onClick={onClick}
    >
      {isLoading ? <span className="login-page__spinner" aria-hidden="true" /> : children}
    </button>
  )
}

function SignupExitConfirmModal({
  isOpen,
  onClose,
  onExit,
  primaryLabel,
  message,
}: {
  isOpen: boolean
  onClose: () => void
  onExit: () => void
  primaryLabel: string
  message: string
}) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="login-limits-exit-modal-container"
      sheetClassName="login-limits-exit-modal"
      bodyClassName="login-limits-exit-modal__body"
      hideScrollIndicator
      blurBackdrop
    >
      <div className="login-limits-exit-modal__content">
        <img
          className="login-limits-exit-modal__illustration"
          src={ilustraModalAtencao}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <h2 className="login-limits-exit-modal__heading">Tem certeza?</h2>
        <p className="login-limits-exit-modal__message">{message}</p>
        <div className="login-limits-exit-modal__actions">
          <button
            type="button"
            className="login-limits-exit-modal__action login-limits-exit-modal__action--primary"
            onClick={onClose}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className="login-limits-exit-modal__action login-limits-exit-modal__action--secondary"
            onClick={onExit}
          >
            Sair
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

function AuthHeader({
  activeStep,
  onBack,
}: {
  activeStep?: SignupStep
  onBack?: () => void
}) {
  const activeStepIndex = activeStep ? signupSteps.indexOf(activeStep) : -1

  return (
    <header
      className={['login-page__header', activeStep ? 'login-page__header--steps' : ''].filter(Boolean).join(' ')}
      aria-label={activeStep ? 'Cabeçalho de cadastro' : 'Cabeçalho de login'}
    >
      <button
        type="button"
        className="login-page__back"
        aria-label="Voltar"
        onClick={onBack}
      >
        <img src={backHeaderIcon} alt="" className="login-page__back-icon" aria-hidden="true" />
      </button>
      {activeStep ? (
        <div className="login-page__progress" aria-label={`Etapa ${activeStepIndex + 1} de ${signupSteps.length}`}>
          {signupSteps.map((step, index) => (
            <span
              key={step}
              className={[
                'login-page__progress-step',
                index <= activeStepIndex ? 'login-page__progress-step--active' : '',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </div>
      ) : null}
    </header>
  )
}

function SocialButtons({
  disabled,
  submittingMethod,
  onGoogleClick,
  onAppleClick,
}: {
  disabled?: boolean
  submittingMethod?: LoginSubmitMethod | null
  onGoogleClick: () => void
  onAppleClick: () => void
}) {
  return (
    <>
      <button
        type="button"
        className={[
          'login-page__social-button',
          submittingMethod === 'google' ? 'login-page__social-button--loading' : '',
        ].filter(Boolean).join(' ')}
        disabled={disabled}
        aria-busy={submittingMethod === 'google'}
        onClick={onGoogleClick}
      >
        {submittingMethod === 'google' ? (
          <span className="login-page__spinner" aria-hidden="true" />
        ) : (
          <>
            <img src={iconGoogle} alt="" className="login-page__social-icon" aria-hidden="true" />
            <span>Continuar com Google</span>
          </>
        )}
      </button>

      <button
        type="button"
        className={[
          'login-page__social-button',
          submittingMethod === 'apple' ? 'login-page__social-button--loading' : '',
        ].filter(Boolean).join(' ')}
        disabled={disabled}
        aria-busy={submittingMethod === 'apple'}
        onClick={onAppleClick}
      >
        {submittingMethod === 'apple' ? (
          <span className="login-page__spinner" aria-hidden="true" />
        ) : (
          <>
            <img src={iconApple} alt="" className="login-page__social-icon" aria-hidden="true" />
            <span>Continuar com Apple</span>
          </>
        )}
      </button>
    </>
  )
}

function SignupCheckbox({
  checked,
  children,
  onChange,
}: {
  checked: boolean
  children: ReactNode
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      className={['login-checkbox', checked ? 'login-checkbox--checked' : ''].filter(Boolean).join(' ')}
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="login-checkbox__box" aria-hidden="true">
        {checked ? <span className="login-checkbox__check" /> : null}
      </span>
      <span className="login-checkbox__label">{children}</span>
    </button>
  )
}

function PhoneInput({
  errorMessage,
  isInvalid = false,
  onBlur,
  value,
  onChange,
  onFocus,
}: {
  errorMessage?: string
  isInvalid?: boolean
  onBlur?: () => void
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const phoneDigits = normalizeBrazilPhone(value)
  const isFilled = phoneDigits.length > 0
  const errorId = 'signup-phone-error'

  const {
    handleFieldPointerDown,
    handleFieldPointerUp,
    handleFieldPointerCancel,
    handleFocus,
  } = useTapFocusScrollGuard({
    inputRef,
    isEnabled: true,
    onFocus,
  })

  return (
    <label
      className={[
        'login-phone-input',
        isFilled ? 'login-phone-input--filled' : '',
        isInvalid ? 'login-phone-input--error' : '',
      ].filter(Boolean).join(' ')}
      htmlFor="signup-phone"
    >
      <span className="login-input__label">Celular</span>
      <span
        className="login-phone-input__container"
        onPointerDown={handleFieldPointerDown}
        onPointerUp={handleFieldPointerUp}
        onPointerCancel={handleFieldPointerCancel}
      >
        <span className="login-phone-input__prefix" aria-label="Brasil +55">
          <img src={flagBrasil} alt="" className="login-phone-input__flag" aria-hidden="true" />
          <span className="login-phone-input__country-code">+55</span>
        </span>
        <span className="login-phone-input__divider" aria-hidden="true" />
        <input
          ref={inputRef}
          id="signup-phone"
          className="login-phone-input__field"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="DDD + número"
          value={formatBrazilPhone(value)}
          aria-describedby={isInvalid && errorMessage ? errorId : undefined}
          aria-invalid={isInvalid || undefined}
          onBlur={onBlur}
          onChange={(event) => onChange(normalizeBrazilPhone(event.target.value))}
          onFocus={handleFocus}
        />
        {isInvalid ? (
          <img src={iconError} alt="" className="login-input__error-icon" aria-hidden="true" />
        ) : null}
      </span>
      {isInvalid && errorMessage ? (
        <span className="login-input__error-message" id={errorId}>{errorMessage}</span>
      ) : null}
    </label>
  )
}

function PhoneValidationCodeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [isFocused, setIsFocused] = useState(false)
  const digits = onlyDigits(value).slice(0, phoneValidationCodeLength)
  const activeIndex = Math.min(digits.length, phoneValidationCodeLength - 1)

  return (
    <label
      className="login-phone-code"
      htmlFor="signup-phone-validation-code"
      onPointerDown={(event) => {
        event.preventDefault()
        focusPhoneValidationInput()
      }}
    >
      <span className="login-phone-code__accessibility-label">Código de verificação</span>
      <input
        id="signup-phone-validation-code"
        className="login-phone-code__input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        enterKeyHint="done"
        value={digits}
        aria-label="Código de verificação"
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onChange(onlyDigits(event.target.value).slice(0, phoneValidationCodeLength))}
        onFocus={() => setIsFocused(true)}
      />
      <span className="login-phone-code__slots" aria-hidden="true">
        {Array.from({ length: phoneValidationCodeLength }, (_, index) => {
          const digit = digits[index]
          const isActive = isFocused && index === activeIndex && digits.length < phoneValidationCodeLength

          return (
            <span
              key={index}
              className={[
                'login-phone-code__slot',
                digit ? 'login-phone-code__slot--filled' : '',
                isActive ? 'login-phone-code__slot--active' : '',
              ].filter(Boolean).join(' ')}
            >
              {digit || (isActive ? '' : '0')}
            </span>
          )
        })}
      </span>
    </label>
  )
}

export function LoginPage({
  mode = 'login',
  motionState = 'open',
  overlayVariant = 'default',
  onBack,
  onCreateAccountClick,
  onDepositOpen,
  onEnterComplete,
  onIdentityExit,
  onIdentityVerificationStart,
  onLoginClick,
  onLoginSuccess,
  onLimitsExit,
  resumeSignupIdentity = false,
  resumeSignupLimits = false,
  showSignupGarantidaBanner = false,
}: LoginPageProps) {
  const loginEnterFallbackTimerRef = useRef<number | null>(null)
  const loginSuccessTimerRef = useRef<number | null>(null)
  const signupActionLoadingTimerRef = useRef<number | null>(null)
  const addressAbortRef = useRef<AbortController | null>(null)
  const cityAbortRef = useRef<AbortController | null>(null)
  const verificationLoadingTimerRef = useRef<number | null>(null)
  const verificationFadeTimerRef = useRef<number | null>(null)
  const authModeMotionTimerRef = useRef<number | null>(null)
  const authModeMotionPhaseRef = useRef<SignupStepMotionPhase>('idle')
  const signupStepMotionTimerRef = useRef<number | null>(null)
  const addressStageMotionTimerRef = useRef<number | null>(null)
  const verificationStreamRef = useRef<MediaStream | null>(null)
  const verificationVideoRef = useRef<HTMLVideoElement | null>(null)
  const loginPageRef = useRef<HTMLElement | null>(null)
  const [displayedMode, setDisplayedMode] = useState<AuthMode>(mode)
  const [authModeMotionPhase, setAuthModeMotionPhase] = useState<SignupStepMotionPhase>('idle')
  const [signupStep, setSignupStep] = useState<SignupStep>(() => (
    mode === 'signup' && (resumeSignupIdentity || resumeSignupLimits) ? 'verification' : 'account'
  ))
  const [signupStepMotionPhase, setSignupStepMotionPhase] = useState<SignupStepMotionPhase>('idle')
  const [addressStage, setAddressStage] = useState<AddressStage>('cep')
  const [addressStageMotionPhase, setAddressStageMotionPhase] = useState<SignupStepMotionPhase>('idle')
  const [signupLoadingAction, setSignupLoadingAction] = useState<SignupLoadingAction | null>(null)
  const [verificationStage, setVerificationStage] = useState<VerificationStage>(() => (
    mode === 'signup' && resumeSignupLimits ? 'limits' : 'intro'
  ))
  const [pendingVerificationStage, setPendingVerificationStage] = useState<VerificationStage | null>(null)
  const [isVerificationFadingOut, setIsVerificationFadingOut] = useState(false)
  const [isVerificationMobile, setIsVerificationMobile] = useState(false)
  const [verificationCameraStatus, setVerificationCameraStatus] = useState<VerificationCameraStatus>('idle')
  const [verificationCameraError, setVerificationCameraError] = useState<string | null>(null)
  const [selectedTimeLimit, setSelectedTimeLimit] = useState(gameTimeLimitOptions[4])
  const [selectedLossLimit, setSelectedLossLimit] = useState(lossLimitOptions[3])
  const [activeCustomLimitSheet, setActiveCustomLimitSheet] = useState<LimitCustomSheetType | null>(null)
  const [customTimeLimitHoursInput, setCustomTimeLimitHoursInput] = useState('')
  const [customTimeLimitMinutesInput, setCustomTimeLimitMinutesInput] = useState('')
  const [customLossLimitInput, setCustomLossLimitInput] = useState('')
  const [customTimeLimitHours, setCustomTimeLimitHours] = useState('')
  const [customTimeLimitMinutes, setCustomTimeLimitMinutes] = useState('')
  const [customLossLimit, setCustomLossLimit] = useState('')
  const [isCustomLimitSheetOpen, setIsCustomLimitSheetOpen] = useState(false)
  const [signupExitRequirement, setSignupExitRequirement] = useState<SignupExitRequirement>('limits')
  const [isSignupExitConfirmOpen, setIsSignupExitConfirmOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailErrorMessage, setEmailErrorMessage] = useState<string | null>(null)
  const [showSignupPasswordValidationErrors, setShowSignupPasswordValidationErrors] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [submittingMethod, setSubmittingMethod] = useState<LoginSubmitMethod | null>(null)
  const [cpf, setCpf] = useState('')
  const [cpfErrorMessage, setCpfErrorMessage] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [phoneErrorMessage, setPhoneErrorMessage] = useState<string | null>(null)
  const [isPhoneValidationOpen, setIsPhoneValidationOpen] = useState(false)
  const [phoneValidationCode, setPhoneValidationCode] = useState('')
  const [phoneValidationSeconds, setPhoneValidationSeconds] = useState(phoneValidationCountdownStart)
  const [acceptsPromos, setAcceptsPromos] = useState(true)
  const [cep, setCep] = useState('')
  const [isUnknownCepSheetOpen, setIsUnknownCepSheetOpen] = useState(false)
  const [region, setRegion] = useState('')
  const [regionUf, setRegionUf] = useState('')
  const [isRegionSheetOpen, setIsRegionSheetOpen] = useState(false)
  const [city, setCity] = useState('')
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [cityLookupStatus, setCityLookupStatus] = useState<AddressLookupStatus>('idle')
  const [isCitySheetOpen, setIsCitySheetOpen] = useState(false)
  const [neighborhood, setNeighborhood] = useState('')
  const [street, setStreet] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [noAddressNumber, setNoAddressNumber] = useState(false)
  const [addressComplement, setAddressComplement] = useState('')
  const [addressLookupStatus, setAddressLookupStatus] = useState<AddressLookupStatus>('idle')
  const [addressLookupError, setAddressLookupError] = useState<string | null>(null)
  const [signupGarantidaCountdownDeadline] = useState(() => getGarantidaPromoDeadline())
  const [signupGarantidaCountdownNow, setSignupGarantidaCountdownNow] = useState(() => Date.now())
  const isEmailValid = useMemo(() => loginEmailPattern.test(email.trim()), [email])
  const isPasswordFilled = password.length > 0
  const isSignupPasswordAccepted = isSignupPasswordValid(password)
  const isSubmitting = submittingMethod !== null
  const isEmailSubmitting = submittingMethod === 'email'
  const isSignupActionLoading = signupLoadingAction !== null
  const canSubmitCredentials = isEmailValid && isPasswordFilled && !isSubmitting
  const canSubmitSignupAccount = isEmailValid && isSignupPasswordAccepted && !isSubmitting
  const showEmailError = emailErrorMessage !== null
  const showSignupPasswordError = showSignupPasswordValidationErrors && !isSignupPasswordAccepted
  const cpfDigits = onlyDigits(cpf)
  const isCpfAccepted = isCpfValid(cpfDigits)
  const phoneDigits = normalizeBrazilPhone(phone)
  const isPhoneAccepted = isBrazilMobilePhoneValid(phoneDigits)
  const phoneValidationDigits = onlyDigits(phoneValidationCode)
  const cepDigits = onlyDigits(cep)
  const canContinuePersonal = isCpfAccepted && isPhoneAccepted
  const canConfirmPhoneValidation = phoneValidationDigits.length === phoneValidationCodeLength
  const isAddressDetailsStage = addressStage === 'details'
  const isAddressSummaryComplete = addressLookupStatus === 'success'
    && street.trim().length > 0
    && neighborhood.trim().length > 0
    && city.trim().length > 0
    && regionUf.trim().length > 0
  const shouldShowManualAddressFields = isAddressDetailsStage && !isAddressSummaryComplete
  const isManualAddressComplete = shouldShowManualAddressFields
    && regionUf.trim().length > 0
    && city.trim().length > 0
    && street.trim().length > 0
  const isAddressBaseComplete = isAddressSummaryComplete || isManualAddressComplete
  const canContinueCep = cepDigits.length === 8 && addressLookupStatus !== 'loading'
  const canConfirmAddress = isAddressDetailsStage
    && isAddressBaseComplete
    && (noAddressNumber || addressNumber.trim().length > 0)
    && addressLookupStatus !== 'loading'
    && (!shouldShowManualAddressFields || (
      cityLookupStatus !== 'loading'
      && cityLookupStatus !== 'error'
    ))
  const isSignupBottomSheetOpen = isPhoneValidationOpen
    || isUnknownCepSheetOpen
    || isRegionSheetOpen
    || isCitySheetOpen
    || isCustomLimitSheetOpen
  const showCpfError = cpfErrorMessage !== null
  const showPhoneError = phoneErrorMessage !== null
  const signupGarantidaCountdown = useMemo(() => (
    getPromoCountdownParts(signupGarantidaCountdownDeadline - signupGarantidaCountdownNow)
  ), [signupGarantidaCountdownDeadline, signupGarantidaCountdownNow])

  const cancelSignupActionLoading = () => {
    if (signupActionLoadingTimerRef.current === null) return

    window.clearTimeout(signupActionLoadingTimerRef.current)
    signupActionLoadingTimerRef.current = null
    setSignupLoadingAction(null)
  }

  const clearAuthSubmitLoadingTimer = useCallback(() => {
    if (loginSuccessTimerRef.current === null) return

    window.clearTimeout(loginSuccessTimerRef.current)
    loginSuccessTimerRef.current = null
  }, [])

  const clearSignupActionLoadingTimer = useCallback(() => {
    if (signupActionLoadingTimerRef.current === null) return

    window.clearTimeout(signupActionLoadingTimerRef.current)
    signupActionLoadingTimerRef.current = null
  }, [])

  const clearAuthModeMotionTimer = useCallback(() => {
    if (authModeMotionTimerRef.current === null) return

    window.clearTimeout(authModeMotionTimerRef.current)
    authModeMotionTimerRef.current = null
  }, [])

  const updateAuthModeMotionPhase = useCallback((nextPhase: SignupStepMotionPhase) => {
    authModeMotionPhaseRef.current = nextPhase
    setAuthModeMotionPhase(nextPhase)
  }, [])

  const clearSignupStepMotionTimer = useCallback(() => {
    if (signupStepMotionTimerRef.current === null) return

    window.clearTimeout(signupStepMotionTimerRef.current)
    signupStepMotionTimerRef.current = null
  }, [])

  const clearAddressStageMotionTimer = useCallback(() => {
    if (addressStageMotionTimerRef.current === null) return

    window.clearTimeout(addressStageMotionTimerRef.current)
    addressStageMotionTimerRef.current = null
  }, [])

  const clearVerificationTimers = useCallback(() => {
    if (verificationLoadingTimerRef.current !== null) {
      window.clearTimeout(verificationLoadingTimerRef.current)
      verificationLoadingTimerRef.current = null
    }

    if (verificationFadeTimerRef.current !== null) {
      window.clearTimeout(verificationFadeTimerRef.current)
      verificationFadeTimerRef.current = null
    }
  }, [])

  const stopVerificationCamera = useCallback(() => {
    verificationStreamRef.current?.getTracks().forEach((track) => track.stop())
    verificationStreamRef.current = null

    if (verificationVideoRef.current) {
      verificationVideoRef.current.srcObject = null
    }
  }, [])

  const clearLoginEnterFallbackTimer = useCallback(() => {
    if (loginEnterFallbackTimerRef.current === null) return

    window.clearTimeout(loginEnterFallbackTimerRef.current)
    loginEnterFallbackTimerRef.current = null
  }, [])

  const handleSurfaceAnimationEnd = useCallback((event: AnimationEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return
    if (event.animationName !== 'login-page-slide-in') return
    if (motionState !== 'entering') return

    clearLoginEnterFallbackTimer()
    onEnterComplete?.()
  }, [clearLoginEnterFallbackTimer, motionState, onEnterComplete])

  const goToSignupStep = useCallback((nextStep: SignupStep) => {
    if (nextStep === signupStep) return

    clearSignupStepMotionTimer()

    setSignupStepMotionPhase('exiting')

    signupStepMotionTimerRef.current = window.setTimeout(() => {
      setSignupStep(nextStep)
      setSignupStepMotionPhase('entering')

      signupStepMotionTimerRef.current = window.setTimeout(() => {
        signupStepMotionTimerRef.current = null
        setSignupStepMotionPhase('idle')
      }, signupStepEnterDurationMs)
    }, signupStepExitDurationMs)
  }, [clearSignupStepMotionTimer, signupStep])

  const goToAddressStage = useCallback((nextStage: AddressStage) => {
    if (nextStage === addressStage) return

    clearAddressStageMotionTimer()
    setAddressStageMotionPhase('exiting')

    addressStageMotionTimerRef.current = window.setTimeout(() => {
      setAddressStage(nextStage)
      setAddressStageMotionPhase('entering')

      addressStageMotionTimerRef.current = window.setTimeout(() => {
        addressStageMotionTimerRef.current = null
        setAddressStageMotionPhase('idle')
      }, verificationFadeDurationMs)
    }, verificationFadeDurationMs)
  }, [addressStage, clearAddressStageMotionTimer])

  const resetAuthPageState = useCallback(() => {
    clearAuthSubmitLoadingTimer()
    clearSignupActionLoadingTimer()
    clearSignupStepMotionTimer()
    clearAddressStageMotionTimer()
    clearVerificationTimers()
    addressAbortRef.current?.abort()
    addressAbortRef.current = null
    cityAbortRef.current?.abort()
    cityAbortRef.current = null
    stopVerificationCamera()

    setSignupStep('account')
    setSignupStepMotionPhase('idle')
    setAddressStage('cep')
    setAddressStageMotionPhase('idle')
    setSignupLoadingAction(null)
    setVerificationStage('intro')
    setPendingVerificationStage(null)
    setIsVerificationFadingOut(false)
    setVerificationCameraStatus('idle')
    setVerificationCameraError(null)
    setSelectedTimeLimit(gameTimeLimitOptions[4])
    setSelectedLossLimit(lossLimitOptions[3])
    setActiveCustomLimitSheet(null)
    setCustomTimeLimitHoursInput('')
    setCustomTimeLimitMinutesInput('')
    setCustomLossLimitInput('')
    setCustomTimeLimitHours('')
    setCustomTimeLimitMinutes('')
    setCustomLossLimit('')
    setIsCustomLimitSheetOpen(false)
    setEmail('')
    setPassword('')
    setEmailErrorMessage(null)
    setShowSignupPasswordValidationErrors(false)
    setIsPasswordVisible(false)
    setSubmittingMethod(null)
    setCpf('')
    setCpfErrorMessage(null)
    setPhone('')
    setPhoneErrorMessage(null)
    setIsPhoneValidationOpen(false)
    setPhoneValidationCode('')
    setPhoneValidationSeconds(phoneValidationCountdownStart)
    setAcceptsPromos(true)
    setCep('')
    setIsUnknownCepSheetOpen(false)
    setRegion('')
    setRegionUf('')
    setIsRegionSheetOpen(false)
    setCity('')
    setCityOptions([])
    setCityLookupStatus('idle')
    setIsCitySheetOpen(false)
    setNeighborhood('')
    setStreet('')
    setAddressNumber('')
    setNoAddressNumber(false)
    setAddressComplement('')
    setAddressLookupStatus('idle')
    setAddressLookupError(null)
  }, [
    clearAuthSubmitLoadingTimer,
    clearSignupActionLoadingTimer,
    clearSignupStepMotionTimer,
    clearAddressStageMotionTimer,
    clearVerificationTimers,
    stopVerificationCamera,
  ])

  useEffect(() => {
    if (mode === displayedMode) {
      if (authModeMotionPhaseRef.current === 'exiting') {
        clearAuthModeMotionTimer()

        authModeMotionTimerRef.current = window.setTimeout(() => {
          authModeMotionTimerRef.current = null
          updateAuthModeMotionPhase('idle')
        }, 0)
      }

      return
    }

    clearAuthModeMotionTimer()

    authModeMotionTimerRef.current = window.setTimeout(() => {
      updateAuthModeMotionPhase('exiting')

      authModeMotionTimerRef.current = window.setTimeout(() => {
        flushSync(() => {
          resetAuthPageState()
          setDisplayedMode(mode)
          updateAuthModeMotionPhase('entering')
        })

        authModeMotionTimerRef.current = window.setTimeout(() => {
          authModeMotionTimerRef.current = null
          updateAuthModeMotionPhase('idle')
        }, signupStepEnterDurationMs)
      }, signupStepExitDurationMs)
    }, 0)
  }, [
    clearAuthModeMotionTimer,
    displayedMode,
    mode,
    resetAuthPageState,
    updateAuthModeMotionPhase,
  ])

  useEffect(() => () => {
    clearLoginEnterFallbackTimer()

    if (loginSuccessTimerRef.current !== null) {
      window.clearTimeout(loginSuccessTimerRef.current)
    }

    if (signupActionLoadingTimerRef.current !== null) {
      window.clearTimeout(signupActionLoadingTimerRef.current)
    }

    if (verificationLoadingTimerRef.current !== null) {
      window.clearTimeout(verificationLoadingTimerRef.current)
    }

    if (verificationFadeTimerRef.current !== null) {
      window.clearTimeout(verificationFadeTimerRef.current)
    }

    if (authModeMotionTimerRef.current !== null) {
      window.clearTimeout(authModeMotionTimerRef.current)
    }

    if (signupStepMotionTimerRef.current !== null) {
      window.clearTimeout(signupStepMotionTimerRef.current)
    }

    if (addressStageMotionTimerRef.current !== null) {
      window.clearTimeout(addressStageMotionTimerRef.current)
    }

    addressAbortRef.current?.abort()
    cityAbortRef.current?.abort()
    stopVerificationCamera()
  }, [clearLoginEnterFallbackTimer, stopVerificationCamera])

  useEffect(() => {
    clearLoginEnterFallbackTimer()

    if (motionState !== 'entering') return

    const fallbackTimer = window.setTimeout(() => {
      loginEnterFallbackTimerRef.current = null
      onEnterComplete?.()
    }, loginPageMotionDurationMs + 40)
    loginEnterFallbackTimerRef.current = fallbackTimer

    return () => {
      window.clearTimeout(fallbackTimer)

      if (loginEnterFallbackTimerRef.current === fallbackTimer) {
        loginEnterFallbackTimerRef.current = null
      }
    }
  }, [clearLoginEnterFallbackTimer, motionState, onEnterComplete])

  useEffect(() => {
    const mediaQueryList = window.matchMedia(mobileCameraMediaQuery)
    const updateMobileStatus = () => {
      setIsVerificationMobile(mediaQueryList.matches || navigator.maxTouchPoints > 1)
    }

    updateMobileStatus()
    mediaQueryList.addEventListener('change', updateMobileStatus)

    return () => mediaQueryList.removeEventListener('change', updateMobileStatus)
  }, [])

  useStableKeyboardViewport({
    rootRef: loginPageRef,
    scrollContainerSelector: '.login-page__container',
    stableHeightCssVariable: '--login-page-stable-height',
    keyboardInsetCssVariable: '--login-page-keyboard-inset',
  })

  useTouchScrollFence(loginPageRef)

  useEffect(() => {
    const captureConfig = verificationStage === 'document-front'
      || verificationStage === 'document-back'
      ? verificationCaptureScreens[verificationStage]
      : null

    let isActive = true
    let cameraStateTimer: number | null = null
    const scheduleCameraState = (status: VerificationCameraStatus, error: string | null = null) => {
      if (cameraStateTimer !== null) {
        window.clearTimeout(cameraStateTimer)
      }

      cameraStateTimer = window.setTimeout(() => {
        cameraStateTimer = null
        if (!isActive) return

        setVerificationCameraStatus(status)
        setVerificationCameraError(error)
      }, 0)
    }

    const clearScheduledCameraState = () => {
      if (cameraStateTimer === null) return

      window.clearTimeout(cameraStateTimer)
      cameraStateTimer = null
    }

    if (!captureConfig || !isVerificationMobile) {
      stopVerificationCamera()
      scheduleCameraState('idle')
      return () => {
        isActive = false
        clearScheduledCameraState()
      }
    }

    stopVerificationCamera()
    scheduleCameraState('loading')

    if (!window.isSecureContext) {
      scheduleCameraState('unavailable', 'Abra o app em HTTPS para ativar a câmera no celular.')
      return () => {
        isActive = false
        clearScheduledCameraState()
      }
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      scheduleCameraState('unavailable', 'Use um navegador ou dispositivo com câmera.')
      return () => {
        isActive = false
        clearScheduledCameraState()
      }
    }

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: captureConfig.cameraFacingMode },
      },
    })
      .then((stream) => {
        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        verificationStreamRef.current = stream

        if (verificationVideoRef.current) {
          verificationVideoRef.current.srcObject = stream
          void verificationVideoRef.current.play()
        }

        setVerificationCameraStatus('ready')
        setVerificationCameraError(null)
      })
      .catch((error: unknown) => {
        if (!isActive) return

        const errorName = error instanceof DOMException ? error.name : ''
        const cameraErrorMessage = verificationCameraErrorMessageByName[errorName]
          ?? 'Confira a permissão da câmera no celular.'

        setVerificationCameraStatus('unavailable')
        setVerificationCameraError(cameraErrorMessage)
      })

    return () => {
      isActive = false
      clearScheduledCameraState()
      stopVerificationCamera()
    }
  }, [isVerificationMobile, stopVerificationCamera, verificationStage])

  useEffect(() => {
    if (!isPhoneValidationOpen) return undefined

    const countdownTimer = window.setInterval(() => {
      setPhoneValidationSeconds((currentSeconds) => (
        currentSeconds <= 0 ? 0 : currentSeconds - 1
      ))
    }, 1000)

    return () => window.clearInterval(countdownTimer)
  }, [isPhoneValidationOpen])

  useEffect(() => {
    if (!showSignupGarantidaBanner) return undefined

    const countdownTimer = window.setInterval(() => {
      setSignupGarantidaCountdownNow(Date.now())
    }, PROMO_COUNTDOWN_TICK_MS)

    return () => window.clearInterval(countdownTimer)
  }, [showSignupGarantidaBanner])

  const resetCityLookup = () => {
    cityAbortRef.current?.abort()
    cityAbortRef.current = null
    setCity('')
    setCityOptions([])
    setCityLookupStatus('idle')
    setIsCitySheetOpen(false)
  }

  const resetAddressDetails = () => {
    setRegion('')
    setRegionUf('')
    resetCityLookup()
    setNeighborhood('')
    setStreet('')
    setAddressNumber('')
    setAddressComplement('')
    setNoAddressNumber(false)
  }

  const loadCityOptions = (uf: string, preferredCity = '', shouldOpenCitySheetOnSuccess = false) => {
    const normalizedUf = uf.toUpperCase()
    const preferredCityValue = preferredCity.trim()

    if (!normalizedUf) {
      resetCityLookup()
      return
    }

    const abortController = new AbortController()
    cityAbortRef.current?.abort()
    cityAbortRef.current = abortController
    setCity(preferredCityValue)
    setCityOptions([])
    setCityLookupStatus('loading')
    setIsCitySheetOpen(false)

    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normalizedUf}/municipios?orderBy=nome`, {
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(cityLookupErrorMessage)

        return response.json() as Promise<IbgeCityResponse[]>
      })
      .then((data) => {
        if (abortController.signal.aborted) return

        const nextCityOptions = data
          .map(({ nome }) => nome?.trim() ?? '')
          .filter((cityName): cityName is string => cityName.length > 0)

        if (nextCityOptions.length === 0) throw new Error(cityLookupErrorMessage)

        setCityOptions(nextCityOptions)
        setCity(preferredCityValue ? getCanonicalCityOption(nextCityOptions, preferredCityValue) : '')
        setCityLookupStatus('success')

        if (cityAbortRef.current === abortController) {
          cityAbortRef.current = null
        }

        if (shouldOpenCitySheetOnSuccess) {
          setIsCitySheetOpen(true)
        }
      })
      .catch(() => {
        if (abortController.signal.aborted) return

        setCity('')
        setCityOptions([])
        setCityLookupStatus('error')
        setIsCitySheetOpen(false)

        if (cityAbortRef.current === abortController) {
          cityAbortRef.current = null
        }
      })
  }

  const lookupCep = (nextCepDigits: string) => {
    const abortController = new AbortController()
    addressAbortRef.current?.abort()
    addressAbortRef.current = abortController
    setAddressLookupStatus('loading')
    setAddressLookupError(null)
    resetAddressDetails()

    // CEP de teste liberado para o protótipo: traz um endereço completo de exemplo.
    if (nextCepDigits === prototypeAllowedCep) {
      setRegion(prototypeAllowedAddress.region)
      setRegionUf(prototypeAllowedAddress.regionUf)
      setCity(prototypeAllowedAddress.city)
      setNeighborhood(prototypeAllowedAddress.neighborhood)
      setStreet(prototypeAllowedAddress.street)
      setAddressNumber('')
      setAddressComplement('')
      setNoAddressNumber(false)
      setAddressLookupStatus('success')
      addressAbortRef.current = null
      goToAddressStage('details')
      return
    }

    fetch(`https://viacep.com.br/ws/${nextCepDigits}/json/`, { signal: abortController.signal })
      .then((response) => {
        if (!response.ok) throw new Error(cepLookupErrorMessage)

        return response.json() as Promise<ViaCepResponse>
      })
      .then((data) => {
        if (abortController.signal.aborted) return
        if (data.erro) {
          resetAddressDetails()
          setAddressLookupStatus('not-found')

          if (addressAbortRef.current === abortController) {
            addressAbortRef.current = null
          }

          goToAddressStage('details')
          return
        }

        const regionOption = getBrazilRegionOptionByUf(data.uf)

        if (!regionOption) throw new Error(cepLookupErrorMessage)

        const nextCity = data.localidade?.trim() ?? ''
        const nextNeighborhood = data.bairro?.trim() ?? ''
        const nextStreet = data.logradouro?.trim() ?? ''

        setRegion(regionOption.label)
        setRegionUf(regionOption.uf)
        setCity(nextCity)
        setNeighborhood(nextNeighborhood)
        setStreet(nextStreet)
        setAddressLookupStatus('success')

        if (addressAbortRef.current === abortController) {
          addressAbortRef.current = null
        }

        if (!nextCity || !nextNeighborhood || !nextStreet) {
          loadCityOptions(regionOption.uf, nextCity)
        }

        goToAddressStage('details')
      })
      .catch(() => {
        if (abortController.signal.aborted) return

        resetAddressDetails()
        setAddressLookupStatus('error')
        setAddressLookupError(cepLookupErrorMessage)

        if (addressAbortRef.current === abortController) {
          addressAbortRef.current = null
        }
      })
  }

  const validateEmail = () => {
    const nextEmailErrorMessage = getEmailErrorMessage(email)

    setEmailErrorMessage(nextEmailErrorMessage)

    return nextEmailErrorMessage === null
  }

  const handleEmailChange = (nextEmail: string) => {
    setEmail(nextEmail)
    setEmailErrorMessage(null)
  }

  const validateSignupPassword = () => {
    const isPasswordAccepted = isSignupPasswordValid(password)

    // Se o usuário apenas focou no campo e saiu sem digitar nada, não mostrar erro.
    setShowSignupPasswordValidationErrors(password.length > 0 && !isPasswordAccepted)

    return isPasswordAccepted
  }

  const handleSignupPasswordChange = (nextPassword: string) => {
    setPassword(nextPassword)
    setShowSignupPasswordValidationErrors(false)
  }

  const validateCpf = () => {
    const nextCpfErrorMessage = getCpfErrorMessage(cpf)

    setCpfErrorMessage(nextCpfErrorMessage)

    return nextCpfErrorMessage === null
  }

  const handleCpfChange = (nextCpf: string) => {
    setCpf(onlyDigits(nextCpf).slice(0, 11))
    setCpfErrorMessage(null)
  }

  const validatePhone = () => {
    const nextPhoneErrorMessage = getPhoneErrorMessage(phone)

    setPhoneErrorMessage(nextPhoneErrorMessage)

    return nextPhoneErrorMessage === null
  }

  const handlePhoneChange = (nextPhone: string) => {
    setPhone(nextPhone)
    setPhoneErrorMessage(null)
  }

  const beginAuthSubmitLoading = (method: LoginSubmitMethod, onComplete: () => void) => {
    if (loginSuccessTimerRef.current !== null) return

    setSubmittingMethod(method)
    loginSuccessTimerRef.current = window.setTimeout(() => {
      loginSuccessTimerRef.current = null
      setSubmittingMethod(null)
      onComplete()
    }, authSubmitLoadingDurationMs)
  }

  const beginSignupActionLoading = (action: SignupLoadingAction, onComplete: () => void) => {
    if (signupActionLoadingTimerRef.current !== null || signupLoadingAction !== null) return

    setSignupLoadingAction(action)
    signupActionLoadingTimerRef.current = window.setTimeout(() => {
      signupActionLoadingTimerRef.current = null
      setSignupLoadingAction(null)
      onComplete()
    }, primaryButtonLoadingDurationMs)
  }

  const beginLoginSuccess = (method: LoginSubmitMethod) => {
    beginAuthSubmitLoading(method, () => onLoginSuccess?.())
  }

  const beginSignupAccountSuccess = (method: LoginSubmitMethod) => {
    beginAuthSubmitLoading(method, () => goToSignupStep('personal'))
  }

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const isEmailAccepted = validateEmail()

    if (!isEmailAccepted || !isPasswordFilled || isSubmitting) return

    beginLoginSuccess('email')
  }

  const handleSignupAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const isEmailAccepted = validateEmail()
    const isPasswordAccepted = validateSignupPassword()

    if (!isEmailAccepted || !isPasswordAccepted || isSubmitting) return

    beginSignupAccountSuccess('email')
  }

  const handlePersonalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const isCpfAcceptedOnSubmit = validateCpf()
    const isPhoneAcceptedOnSubmit = validatePhone()

    if (!isCpfAcceptedOnSubmit || !isPhoneAcceptedOnSubmit || !canContinuePersonal || isSignupActionLoading) return

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    flushSync(() => {
      setPhoneValidationCode('')
      setPhoneValidationSeconds(phoneValidationCountdownStart)
      setIsPhoneValidationOpen(true)
    })
  }

  const confirmPhoneValidation = () => {
    if (!canConfirmPhoneValidation || isSignupActionLoading) return

    beginSignupActionLoading('phone-validation', () => {
      setIsPhoneValidationOpen(false)
      goToSignupStep('address')
    })
  }

  const closePhoneValidation = () => {
    cancelSignupActionLoading()
    setIsPhoneValidationOpen(false)
  }

  const handlePhoneValidationCodeChange = (value: string) => {
    setPhoneValidationCode(value)
  }

  const handlePhoneValidationResend = () => {
    setPhoneValidationSeconds(phoneValidationCountdownStart)
  }

  const handlePhoneValidationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    confirmPhoneValidation()
  }

  const handleAddressSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (addressStage === 'cep') {
      if (!canContinueCep || isSignupActionLoading) return

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }

      lookupCep(cepDigits)
      return
    }

    if (!canConfirmAddress || isSignupActionLoading) return

    beginSignupActionLoading('address', () => {
      setVerificationStage('intro')
      goToSignupStep('verification')
    })
  }

  const handleAddressEdit = () => {
    addressAbortRef.current?.abort()
    addressAbortRef.current = null
    setAddressLookupError(null)
    setIsRegionSheetOpen(false)
    setIsCitySheetOpen(false)
    goToAddressStage('cep')
  }

  const handleVerificationStart = () => {
    if (isSignupActionLoading) return

    clearVerificationTimers()
    beginSignupActionLoading('verification-start', () => {
      onIdentityVerificationStart?.()
      setPendingVerificationStage(null)
      setIsVerificationFadingOut(false)
      setVerificationStage('document-front')
    })
  }

  const transitionToNextVerificationStage = (stage: VerificationCaptureStage) => {
    if (isVerificationFadingOut) return

    const nextStage = verificationNextStageByCapture[stage]

    clearVerificationTimers()
    setPendingVerificationStage(nextStage)
    setIsVerificationFadingOut(true)

    verificationFadeTimerRef.current = window.setTimeout(() => {
      verificationFadeTimerRef.current = null
      setVerificationStage('loading')
      setIsVerificationFadingOut(false)

      verificationLoadingTimerRef.current = window.setTimeout(() => {
        verificationLoadingTimerRef.current = null
        setPendingVerificationStage(null)
        setVerificationStage(nextStage)
      }, verificationLoadingDurationMs)
    }, verificationFadeDurationMs)
  }

  const handleVerificationSkip = (stage: VerificationCaptureStage) => {
    transitionToNextVerificationStage(stage)
  }

  const handleVerificationCapture = (stage: VerificationCaptureStage) => {
    if (isVerificationMobile && verificationCameraStatus !== 'ready') return

    transitionToNextVerificationStage(stage)
  }

  const openCustomLimitSheet = (type: LimitCustomSheetType) => {
    if (type === 'time') {
      setCustomTimeLimitHoursInput(customTimeLimitHours)
      setCustomTimeLimitMinutesInput(customTimeLimitHours === '24' ? '' : customTimeLimitMinutes)
    } else {
      setCustomLossLimitInput(customLossLimit)
    }

    setActiveCustomLimitSheet(type)
    setIsCustomLimitSheetOpen(true)
  }

  const closeCustomLimitSheet = () => {
    cancelSignupActionLoading()
    setIsCustomLimitSheetOpen(false)
  }

  const handleCustomLimitSubmit = () => {
    if (isSignupActionLoading) return

    if (activeCustomLimitSheet === 'time') {
      if (!isCustomTimeLimitValid(customTimeLimitHoursInput, customTimeLimitMinutesInput)) return

      beginSignupActionLoading('custom-limit', () => {
        setCustomTimeLimitHours(customTimeLimitHoursInput)
        setCustomTimeLimitMinutes(customTimeLimitHoursInput === '24' ? '' : customTimeLimitMinutesInput)
        setSelectedTimeLimit(customLimitOption)
        closeCustomLimitSheet()
      })
      return
    }

    if (activeCustomLimitSheet === 'loss') {
      if (parseCurrencyLimitCents(customLossLimitInput) <= 0) return

      beginSignupActionLoading('custom-limit', () => {
        setCustomLossLimit(customLossLimitInput)
        setSelectedLossLimit(customLimitOption)
        closeCustomLimitSheet()
      })
    }
  }

  const handleLimitsSave = () => {
    if (isSignupActionLoading) return

    beginSignupActionLoading('limits-save', () => onDepositOpen?.())
  }

  const handleSignupClose = () => {
    cancelSignupActionLoading()
    clearVerificationTimers()
    setPendingVerificationStage(null)
    setIsVerificationFadingOut(false)
    onBack?.()
  }

  const handleSignupExitConfirmOpen = (requirement: SignupExitRequirement) => {
    if (isSignupActionLoading) return

    setSignupExitRequirement(requirement)
    setIsSignupExitConfirmOpen(true)
  }

  const handleSignupExitConfirmClose = () => {
    setIsSignupExitConfirmOpen(false)
  }

  const handleSignupExitConfirm = () => {
    const requirement = signupExitRequirement

    setIsSignupExitConfirmOpen(false)

    const onExit = requirement === 'identity' ? onIdentityExit : onLimitsExit

    if (onExit) {
      onExit()
      return
    }

    handleSignupClose()
  }

  const handleBack = () => {
    cancelSignupActionLoading()

    if (displayedMode !== 'signup') {
      onBack?.()
      return
    }

    if (signupStep === 'verification' && verificationStage !== 'intro') {
      clearVerificationTimers()
      setPendingVerificationStage(null)
      setIsVerificationFadingOut(false)
      setVerificationStage('intro')
      return
    }

    if (signupStep === 'address') {
      goToSignupStep('personal')
      return
    }

    if (signupStep === 'personal') {
      goToSignupStep('account')
      return
    }

    onBack?.()
  }

  const renderPasswordTrailingAction = () => {
    if (!isPasswordFilled) return null

    const handlePasswordEyePointerEvent = (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation()
    }

    return (
      <button
        type="button"
        className="login-input__eye"
        aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
        onPointerDown={handlePasswordEyePointerEvent}
        onPointerUp={handlePasswordEyePointerEvent}
        onPointerCancel={handlePasswordEyePointerEvent}
        onClick={() => setIsPasswordVisible((current) => !current)}
      >
        <img
          src={isPasswordVisible ? iconEye : iconEyeHide}
          alt=""
          className="login-input__eye-icon"
          aria-hidden="true"
        />
      </button>
    )
  }

  const renderLogin = () => (
    <>
      <AuthHeader onBack={handleBack} />

      <section className="login-page__container" aria-labelledby="login-page-title">
        <h1 className="login-page__title" id="login-page-title">Iniciar sessão</h1>

        <form className="login-page__form-section" onSubmit={handleLoginSubmit} noValidate>
          <div className="login-page__field-stack">
            <LoginInput
              id="login-email"
              label="E-mail"
              icon={iconEmail}
              placeholder="nome@email.com"
              value={email}
              type="email"
              autoComplete="email"
              inputMode="email"
              errorMessage={emailErrorMessage ?? undefined}
              isInvalid={showEmailError}
              preventScrollOnFocus
              onBlur={validateEmail}
              onChange={handleEmailChange}
              onFocus={() => setEmailErrorMessage(null)}
            />
            <LoginInput
              id="login-password"
              label="Senha"
              icon={iconPass}
              placeholder="••••••••••••••"
              value={password}
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              isPasswordField
              preventScrollOnFocus
              onChange={(nextPassword) => {
                setPassword(nextPassword)
                setShowSignupPasswordValidationErrors(false)
              }}
              trailingAction={renderPasswordTrailingAction()}
            />

            <div className="login-page__assist-row">
              <button type="button" className="login-page__biometry">
                <img src={iconBiometria} alt="" className="login-page__biometry-icon" aria-hidden="true" />
                <span>Usar biometria</span>
              </button>
              <button type="button" className="login-page__link-button">
                Esqueci minha senha
              </button>
            </div>
          </div>

          <PrimaryButton
            type="submit"
            disabled={!canSubmitCredentials}
            isLoading={isEmailSubmitting}
          >
            Entrar
          </PrimaryButton>
        </form>

        <div className="login-page__social-section">
          <div className="login-page__divider-text">Ou continue com</div>

          <SocialButtons
            disabled={isSubmitting}
            submittingMethod={submittingMethod}
            onAppleClick={() => beginLoginSuccess('apple')}
            onGoogleClick={() => beginLoginSuccess('google')}
          />

          <div className="login-page__signup">
            <span>Ainda não tem uma conta?</span>
            <button type="button" className="login-page__signup-link" onClick={onCreateAccountClick}>
              Criar conta
            </button>
          </div>
        </div>
      </section>
    </>
  )

  const renderSignupGarantidaBanner = () => {
    if (!showSignupGarantidaBanner) return null

    return (
      <aside className="login-page__garantida-banner" aria-label="Promoção Garantida">
        <img
          src={glowGarantidaCadastro01}
          alt=""
          className="login-page__garantida-banner-glow login-page__garantida-banner-glow--left"
          aria-hidden="true"
        />
        <img
          src={imgLewandowskiPromo}
          alt=""
          className="login-page__garantida-banner-player"
          aria-hidden="true"
        />
        <img
          src={glowGarantidaCadastro02}
          alt=""
          className="login-page__garantida-banner-glow login-page__garantida-banner-glow--right"
          aria-hidden="true"
        />

        <div className="login-page__garantida-banner-copy">
          <p className="login-page__garantida-banner-kicker">OFERTA TE ESPERANDO!</p>
          <div className="login-page__garantida-banner-row">
            <div className="login-page__garantida-banner-market">
              <strong>R. LEWANDOWSKI</strong>
              <span><b>0.5+</b> Finalizações ao gol</span>
            </div>
            <div
              className="login-page__garantida-banner-timer"
              aria-label={getCountdownAriaLabel(signupGarantidaCountdown)}
            >
              <img src={iconClock} alt="" className="login-page__garantida-banner-timer-icon" aria-hidden="true" />
              <span className="login-page__garantida-banner-timer-text">
                <span>{formatPromoCountdownSegment(signupGarantidaCountdown.hours)} h</span>
                <span className="login-page__garantida-banner-timer-separator">:</span>
                <span>{formatPromoCountdownSegment(signupGarantidaCountdown.minutes)} m</span>
              </span>
            </div>
          </div>
        </div>
        <div className="login-page__garantida-banner-tag">
          <img src={iconOferta} alt="" aria-hidden="true" />
          <strong>GARANTIDA</strong>
        </div>
      </aside>
    )
  }

  const renderSignupAccount = () => (
    <section
      className="login-page__container login-page__container--signup"
      aria-labelledby="signup-account-title"
    >
      {renderSignupGarantidaBanner()}

      <div className="login-page__title-row">
        <h1 className="login-page__title" id="signup-account-title">Criar conta</h1>
        <button type="button" className="login-page__support" aria-label="Suporte">
          <img src={iconSuporte} alt="" className="login-page__support-icon" aria-hidden="true" />
        </button>
      </div>

      <form className="login-page__form-section login-page__form-section--signup" onSubmit={handleSignupAccountSubmit} noValidate>
        <div className="login-page__field-stack">
          <LoginInput
            id="signup-email"
            label="E-mail"
            icon={iconEmail}
            placeholder="nome@email.com"
            value={email}
            type="email"
            autoComplete="email"
            inputMode="email"
            errorMessage={emailErrorMessage ?? undefined}
            isInvalid={showEmailError}
            preventScrollOnFocus
            onBlur={validateEmail}
            onChange={handleEmailChange}
            onFocus={() => setEmailErrorMessage(null)}
          />
          <div className="login-password-field">
            <LoginInput
              id="signup-password"
              label="Senha"
              icon={iconPass}
              placeholder="••••••••••••••"
              value={password}
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="new-password"
              describedBy="signup-password-rules"
              isPasswordField
              isInvalid={showSignupPasswordError}
              preventScrollOnFocus
              onBlur={validateSignupPassword}
              onChange={handleSignupPasswordChange}
              onFocus={() => setShowSignupPasswordValidationErrors(false)}
              trailingAction={renderPasswordTrailingAction()}
            />
            <SignupPasswordRequirements
              password={password}
              showInvalidRequirements={showSignupPasswordError}
            />
          </div>
        </div>

        <PrimaryButton
          type="submit"
          disabled={!canSubmitSignupAccount}
          isLoading={isEmailSubmitting}
        >
          Criar conta
        </PrimaryButton>
      </form>

      <div className="login-page__social-section">
        <div className="login-page__divider-text login-page__divider-text--compact">Ou continue com</div>

        <SocialButtons
          disabled={isSubmitting}
          submittingMethod={submittingMethod}
          onAppleClick={() => beginSignupAccountSuccess('apple')}
          onGoogleClick={() => beginSignupAccountSuccess('google')}
        />

        <div className="login-page__signup">
          <span>Já tem uma conta?</span>
          <button type="button" className="login-page__signup-link" onClick={onLoginClick}>
            Entrar
          </button>
        </div>
      </div>

      <p className="login-page__legal">
        Ao continuar, declaro que tenho mais de 18 anos, aceito os{' '}
        <button type="button" className="login-page__legal-link">Termos de uso</button> e as{' '}
        <button type="button" className="login-page__legal-link">Políticas de Privacidade</button>, e entendo que
        o Pitaco apoia a{' '}
        <button type="button" className="login-page__legal-link">Política de Jogo Responsável</button>.
      </p>
    </section>
  )

  const renderSignupPersonal = () => (
    <section
      className="login-page__container login-page__container--signup login-page__container--personal"
      aria-labelledby="signup-personal-title"
    >
      {renderSignupGarantidaBanner()}

      <h1 className="login-page__title" id="signup-personal-title">Dados para começar a jogar</h1>
      <p className="login-page__description">
        Precisamos do seu CPF e celular para validar sua identidade, de acordo com a legislação brasileira.
        Isso permite jogar com segurança e evita fraudes.
      </p>

      <form className="login-page__form-section login-page__form-section--signup" onSubmit={handlePersonalSubmit} noValidate>
        <div className="login-page__field-stack">
          <LoginInput
            id="signup-cpf"
            label="CPF"
            icon={iconCPF}
            placeholder="000.000.000-00"
            value={formatCpf(cpf)}
            type="tel"
            autoComplete="off"
            inputMode="numeric"
            maxLength={14}
            errorMessage={cpfErrorMessage ?? undefined}
            isInvalid={showCpfError}
            preventScrollOnFocus
            onBlur={validateCpf}
            onChange={handleCpfChange}
            onFocus={() => setCpfErrorMessage(null)}
          />
          <PhoneInput
            value={phone}
            errorMessage={phoneErrorMessage ?? undefined}
            isInvalid={showPhoneError}
            onBlur={validatePhone}
            onChange={handlePhoneChange}
            onFocus={() => setPhoneErrorMessage(null)}
          />
        </div>

        <SignupCheckbox checked={acceptsPromos} onChange={setAcceptsPromos}>
          Quero receber promoções, novidades e outras comunicações da Pitaco
        </SignupCheckbox>

        <PrimaryButton
          type="submit"
          disabled={!canContinuePersonal || isSignupActionLoading}
          isLoading={signupLoadingAction === 'personal'}
        >
          Continuar
        </PrimaryButton>
      </form>
    </section>
  )

  const renderPhoneValidationBottomSheet = () => (
    <BottomSheet
      isOpen={isPhoneValidationOpen}
      onClose={closePhoneValidation}
      title="Validar celular"
      leadingContent={<span className="login-phone-validation-sheet__header-spacer" aria-hidden="true" />}
      containerClassName="login-page__bottom-sheet-container"
      sheetClassName="login-phone-validation-sheet"
      bodyClassName="login-phone-validation-sheet__body"
      blurBackdrop
      footerContent={(
        <PrimaryButton
          type="button"
          disabled={!canConfirmPhoneValidation || isSignupActionLoading}
          isLoading={signupLoadingAction === 'phone-validation'}
          onClick={confirmPhoneValidation}
        >
          Validar celular
        </PrimaryButton>
      )}
      hideScrollIndicator
    >
      <form
        className="login-phone-validation"
        onSubmit={handlePhoneValidationSubmit}
        noValidate
      >
        <div className="login-phone-validation__copy">
          <p className="login-phone-validation__description">
            Insira o código de 6 dígitos que enviamos para o número{' '}
            <strong className="login-phone-validation__phone">{formatBrazilPhoneForValidation(phoneDigits)}</strong>
          </p>
          <p className="login-phone-validation__change">
            <span>Número errado?</span>
            <button
              type="button"
              className="login-phone-validation__change-button"
              onClick={closePhoneValidation}
            >
              Altere aqui.
            </button>
          </p>
        </div>

        <div className="login-phone-validation__code-group">
          <PhoneValidationCodeInput
            value={phoneValidationCode}
            onChange={handlePhoneValidationCodeChange}
          />
          {phoneValidationSeconds > 0 ? (
            <p className="login-phone-validation__resend">
              <span>Reenviar código em</span>
              <strong>{phoneValidationSeconds} seg</strong>
            </p>
          ) : (
            <div className="login-phone-validation__resend">
              <span>Não recebeu o código?</span>
              <button
                type="button"
                className="login-phone-validation__resend-action"
                onClick={handlePhoneValidationResend}
              >
                Reenviar código
              </button>
            </div>
          )}
        </div>
      </form>
    </BottomSheet>
  )

  const renderUnknownCepBottomSheet = () => (
    <BottomSheet
      isOpen={isUnknownCepSheetOpen}
      onClose={() => setIsUnknownCepSheetOpen(false)}
      containerClassName="login-page__bottom-sheet-container"
      sheetClassName="login-unknown-cep-sheet"
      bodyClassName="login-unknown-cep-sheet__body"
      footerContent={(
        <a
          className="login-page__submit login-page__submit--active login-unknown-cep__correios-link"
          href={correiosCepSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsUnknownCepSheetOpen(false)}
        >
          Buscar CEP no site dos Correios
        </a>
      )}
      blurBackdrop
      hideScrollIndicator
    >
      <div className="login-unknown-cep">
        <img src={iconLocalizacao} alt="" className="login-unknown-cep__icon" aria-hidden="true" />
        <div className="login-unknown-cep__content">
          <h2 className="login-unknown-cep__title">Não sei meu CEP</h2>
          <div className="login-unknown-cep__description">
            <p>
              Para concluir seu cadastro conforme a regulamentação brasileira, precisamos que você informe um CEP válido.
            </p>
            <p>
              Caso não saiba qual é o seu CEP, busque de forma rápida no site dos Correios.
            </p>
          </div>
        </div>
      </div>
    </BottomSheet>
  )

  const renderAddressSelectBottomSheet = ({
    isOpen,
    legend,
    name,
    options,
    selectedValue,
    title,
    onClose,
    onSelect,
  }: {
    isOpen: boolean
    legend: string
    name: string
    options: string[]
    selectedValue: string
    title: string
    onClose: () => void
    onSelect: (option: string) => void
  }) => (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      containerClassName="login-page__bottom-sheet-container"
      sheetClassName="login-region-sheet"
      bodyClassName="login-region-sheet__body"
      blurBackdrop
    >
      <fieldset className="login-region-sheet__options">
        <legend className="login-region-sheet__legend">{legend}</legend>
        {options.map((option) => (
          <label key={option} className="login-region-sheet__option">
            <span className="login-region-sheet__option-label">{option}</span>
            <input
              className="login-region-sheet__radio"
              type="radio"
              name={name}
              value={option}
              checked={selectedValue === option}
              onChange={() => onSelect(option)}
            />
          </label>
        ))}
      </fieldset>
    </BottomSheet>
  )

  const renderRegionBottomSheet = () => renderAddressSelectBottomSheet({
    isOpen: isRegionSheetOpen,
    legend: 'Estado/Região',
    name: 'signup-region',
    options: brazilRegionOptions.map((option) => option.label),
    selectedValue: region,
    title: 'Selecione um Estado',
    onClose: () => setIsRegionSheetOpen(false),
    onSelect: (selectedRegion) => {
      const regionOption = brazilRegionOptions.find((option) => option.label === selectedRegion)

      if (!regionOption) return

      setRegion(regionOption.label)
      setRegionUf(regionOption.uf)
      setIsRegionSheetOpen(false)
      setCity('')
      loadCityOptions(regionOption.uf, '', true)
    },
  })

  const renderCityBottomSheet = () => renderAddressSelectBottomSheet({
    isOpen: isCitySheetOpen,
    legend: 'Cidade',
    name: 'signup-city',
    options: cityOptions,
    selectedValue: city,
    title: 'Selecione uma Cidade',
    onClose: () => setIsCitySheetOpen(false),
    onSelect: (selectedCity) => {
      setCity(selectedCity)
      setIsCitySheetOpen(false)
    },
  })

  const renderAddressManualFields = () => (
    <>
      <AddressSelect
        id="signup-region"
        label="Estado/Região"
        placeholder="Insira o estado ou região"
        value={region}
        isOpen={isRegionSheetOpen}
        onOpen={() => {
          // Fecha o teclado antes de abrir a sheet para ela não ficar coberta.
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }

          setIsRegionSheetOpen(true)
        }}
      />
      <AddressSelect
        id="signup-city"
        label="Cidade"
        placeholder={
          !regionUf
            ? 'Selecione o estado primeiro'
            : cityLookupStatus === 'loading'
              ? 'Carregando cidades...'
              : 'Selecione a cidade'
        }
        value={city}
        disabled={!regionUf || cityLookupStatus !== 'success' || cityOptions.length === 0}
        isOpen={isCitySheetOpen}
        onOpen={() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }

          setIsCitySheetOpen(true)
        }}
      />
      {cityLookupStatus === 'loading' ? (
        <div className="login-page__lookup-status" role="status">Carregando cidades...</div>
      ) : null}
      {cityLookupStatus === 'error' ? (
        <div className="login-page__lookup-status login-page__lookup-status--error" role="status">
          <span>{cityLookupErrorMessage}.</span>
          <button
            type="button"
            className="login-page__lookup-retry"
            onClick={() => loadCityOptions(regionUf, '', true)}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}
      <LoginInput
        id="signup-neighborhood"
        label="Bairro"
        placeholder="Insira o bairro"
        value={neighborhood}
        preventScrollOnFocus
        onChange={setNeighborhood}
      />
      <LoginInput
        id="signup-street"
        label="Endereço - Rua, Avenida"
        placeholder="Insira o endereço"
        value={street}
        preventScrollOnFocus
        onChange={setStreet}
      />
    </>
  )

  const renderAddressNumberFields = () => (
    <>
      <LoginInput
        id="signup-number"
        label="Número"
        placeholder="Insira o número"
        value={addressNumber}
        type="tel"
        inputMode="numeric"
        preventScrollOnFocus
        onChange={(nextNumber) => setAddressNumber(onlyDigits(nextNumber).slice(0, 8))}
      />
      <SignupCheckbox checked={noAddressNumber} onChange={setNoAddressNumber}>
        Endereço sem número
      </SignupCheckbox>
      <LoginInput
        id="signup-complement"
        label="Complemento"
        placeholder="Insira o complemento (se tiver)"
        value={addressComplement}
        preventScrollOnFocus
        onChange={setAddressComplement}
      />
    </>
  )

  const renderAddressSummary = () => {
    const addressSummaryLines = isAddressSummaryComplete
      ? [
          `${street.trim()} - ${neighborhood.trim()}`,
          `${city.trim()} - ${regionUf.trim()}`,
          formatCep(cep),
        ]
      : [formatCep(cep)]

    return (
      <div className="login-page__address-summary" aria-label="Endereço informado">
        <div className="login-page__address-summary-text">
          {addressSummaryLines.map((line, index) => (
            <span key={`${line}-${index}`} className="login-page__address-summary-line">
              {line}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="login-page__address-edit"
          onClick={handleAddressEdit}
        >
          Editar
        </button>
      </div>
    )
  }

  const addressStageMotionClassName = [
    'login-page__address-stage',
    addressStageMotionPhase !== 'idle' ? `login-page__address-stage--${addressStageMotionPhase}` : '',
  ].filter(Boolean).join(' ')

  const renderSignupAddress = () => (
    <section
      className={[
        'login-page__container',
        'login-page__container--signup',
        'login-page__container--address',
        // Antes de avançar do CEP, não reserva espaço de scroll
        // para o teclado: o conteúdo cabe na tela e nada deve rolar.
        addressStage === 'cep' ? 'login-page__container--no-keyboard-inset' : '',
      ].filter(Boolean).join(' ')}
      aria-labelledby="signup-address-title"
    >
      {renderSignupGarantidaBanner()}

      <h1 className="login-page__title" id="signup-address-title">Onde você mora?</h1>

      <form className="login-page__form-section login-page__form-section--signup" onSubmit={handleAddressSubmit} noValidate>
        <div className={addressStageMotionClassName}>
          <div className="login-page__field-stack">
            {addressStage === 'cep' ? (
              <>
                <LoginInput
                  id="signup-cep"
                  label="CEP"
                  placeholder="00000-000"
                  value={formatCep(cep)}
                  type="tel"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={9}
                  errorMessage={addressLookupError ?? undefined}
                  isInvalid={addressLookupStatus === 'error'}
                  preventScrollOnFocus
                  onChange={(nextCep) => {
                    const nextCepDigits = onlyDigits(nextCep).slice(0, 8)

                    setCep(nextCepDigits)
                    setAddressLookupError(null)
                    addressAbortRef.current?.abort()
                    addressAbortRef.current = null
                    setAddressLookupStatus('idle')
                    resetAddressDetails()
                  }}
                />
                <button
                  type="button"
                  className="login-page__cep-help"
                  onClick={() => setIsUnknownCepSheetOpen(true)}
                >
                  Não sei meu CEP
                </button>
              </>
            ) : (
              <>
                {renderAddressSummary()}
                {shouldShowManualAddressFields ? renderAddressManualFields() : null}
                {renderAddressNumberFields()}
              </>
            )}
          </div>
        </div>

        <PrimaryButton
          type="submit"
          disabled={
            addressStage === 'cep'
              ? (!canContinueCep || isSignupActionLoading)
              : (!canConfirmAddress || isSignupActionLoading)
          }
          isLoading={
            addressStage === 'cep'
              ? addressLookupStatus === 'loading'
              : signupLoadingAction === 'address'
          }
        >
          {addressStage === 'cep' ? 'Continuar' : 'Confirmar endereço'}
        </PrimaryButton>
      </form>
    </section>
  )

  const renderVerificationIntro = () => (
    <section className="login-page__verification" aria-labelledby="signup-verification-title">
      <button
        type="button"
        className="login-page__verification-close"
        aria-label="Fechar verificação de identidade"
        onClick={() => handleSignupExitConfirmOpen('identity')}
      >
        <img src={closeBSIcon} alt="" aria-hidden="true" />
      </button>

      <div className="login-page__verification-body">
        <div className="login-page__verification-card" aria-hidden="true">
          <div className="login-page__verification-visual">
            <img
              src={imgVerificaIdentidadeLogo}
              alt=""
              className="login-page__verification-logo"
              aria-hidden="true"
            />
            <span className="login-page__verification-mask-clip" aria-hidden="true">
              <span className="login-page__verification-mask-window">
                <span className="login-page__verification-mask" />
              </span>
            </span>
            <img
              src={imgVerificaIdentidadeBorda}
              alt=""
              className="login-page__verification-frame"
              aria-hidden="true"
            />
            <span className="login-page__verification-scan-line" aria-hidden="true" />
          </div>
        </div>
        <div className="login-page__verification-copy">
          <h1 className="login-page__verification-title" id="signup-verification-title">
            Vamos verificar sua identidade
          </h1>
          <p className="login-page__verification-description">
            Para jogar com tudo, precisamos verificar sua identidade. Fique em um lugar bem iluminado e sem acessórios
            como óculos ou boné.
          </p>
        </div>
      </div>

      <div className="login-page__verification-footer">
        <PrimaryButton
          type="button"
          disabled={isSignupActionLoading}
          isLoading={signupLoadingAction === 'verification-start'}
          onClick={handleVerificationStart}
        >
          Verificar identidade agora
        </PrimaryButton>
        <div className="login-page__unico">
          <span>Verificação protegida por</span>
          <img src={logoUnico} alt="Unico" className="login-page__unico-logo" />
        </div>
      </div>
    </section>
  )

  const renderVerificationCapture = (stage: VerificationCaptureStage) => {
    if (stage === 'face') {
      return (
        <FacialVerificationCapture
          isFadingOut={isVerificationFadingOut}
          onComplete={() => transitionToNextVerificationStage('face')}
        />
      )
    }

    const captureConfig = verificationCaptureScreens[stage]
    const isCaptureButtonDisabled = !isVerificationMobile
      || isVerificationFadingOut
      || verificationCameraStatus !== 'ready'
    const shouldShowCaptureAction = isVerificationMobile && verificationCameraStatus === 'ready'
    const shouldShowSkipVerification = !isVerificationMobile
      || (verificationCameraStatus === 'unavailable' && verificationCameraError !== null)
    const cameraStatusLabel = verificationCameraStatus === 'loading'
      ? 'Carregando câmera...'
      : verificationCameraError ?? 'A câmera será exibida no celular.'

    return (
      <section
        className={[
          'login-page__verification',
          'login-page__verification--capture',
        ].filter(Boolean).join(' ')}
        aria-labelledby={`signup-verification-${stage}-title`}
      >
        <div
          className={[
            'login-page__verification-step',
            isVerificationFadingOut ? 'login-page__verification-step--fading' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="login-page__verification-body login-page__verification-body--capture">
            <p className="login-page__capture-eyebrow">{captureConfig.eyebrow}</p>

            <button
              type="button"
              className={[
                'login-page__capture-card',
              ].filter(Boolean).join(' ')}
              disabled={isCaptureButtonDisabled}
              aria-label={captureConfig.ariaLabel}
              onClick={() => handleVerificationCapture(stage)}
            >
              {isVerificationMobile ? (
                <video
                  ref={verificationVideoRef}
                  className={[
                    'login-page__capture-video',
                  ].filter(Boolean).join(' ')}
                  autoPlay
                  muted
                  playsInline
                />
              ) : null}

              {isVerificationMobile && verificationCameraStatus === 'ready' ? null : (
                <span className="login-page__capture-status">
                  {verificationCameraStatus === 'loading' ? (
                    <span className="login-page__capture-status-spinner" aria-hidden="true" />
                  ) : null}
                  <span>{cameraStatusLabel}</span>
                </span>
              )}

              <span
              className={[
                'login-page__capture-target',
              ].filter(Boolean).join(' ')}
                aria-hidden="true"
              />
            </button>

            <div className="login-page__verification-copy">
              <h1 className="login-page__verification-title" id={`signup-verification-${stage}-title`}>
                {captureConfig.title}
              </h1>
            </div>
          </div>

          {shouldShowCaptureAction || shouldShowSkipVerification ? (
            <div className="login-page__verification-footer login-page__verification-footer--capture">
              {shouldShowCaptureAction ? (
                <PrimaryButton
                  type="button"
                  disabled={isVerificationFadingOut}
                  onClick={() => handleVerificationCapture(stage)}
                >
                  Capturar foto
                </PrimaryButton>
              ) : (
                <button
                  type="button"
                  className="login-page__skip-verification"
                  disabled={isVerificationFadingOut}
                  onClick={() => handleVerificationSkip(stage)}
                >
                  Pular verificação
                </button>
              )}
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  const renderVerificationLoading = () => (
    <IdentityVerificationLoading
      message={pendingVerificationStage === 'limits' ? 'Validando identidade' : 'Carregando próxima etapa'}
    />
  )

  const renderLimitChips = (
    options: string[],
    selectedValue: string,
    onSelect: (value: string) => void,
    customSheetType: LimitCustomSheetType,
  ) => (
    <div className="login-page__limit-chips">
      {options.map((option) => {
        const isSelected = selectedValue === option
        const isCustomOption = option === customLimitOption

        return (
          <button
            key={option}
            type="button"
            className={[
              'login-page__limit-chip',
              isSelected ? 'login-page__limit-chip--selected' : '',
            ].filter(Boolean).join(' ')}
            aria-pressed={isSelected}
            onClick={() => {
              if (isCustomOption) {
                openCustomLimitSheet(customSheetType)
                return
              }

              onSelect(option)
            }}
          >
            {option}
          </button>
        )
      })}
    </div>
  )

  const renderVerificationLimits = () => (
    <section className="login-page__verification login-page__verification--limits" aria-labelledby="signup-limits-title">
      <header className="login-page__limits-header">
        <span className="login-page__limits-header-spacer" aria-hidden="true" />
        <h1 className="login-page__limits-header-title" id="signup-limits-title">Limites de jogo</h1>
        <button
          type="button"
          className="login-page__limits-close"
          aria-label="Fechar limites de jogo"
          onClick={() => handleSignupExitConfirmOpen('limits')}
        >
          <img src={closeBSIcon} alt="" aria-hidden="true" />
        </button>
      </header>

      <div className="login-page__limits-body">
        <p className="login-page__limits-description">
          De acordo com a legislação brasileira, é necessário definir limites de tempo e de perdas para continuar a jogar.
        </p>

        <div className="login-page__limits-groups">
          <section
            className="login-page__limits-group login-page__limits-group--divided"
            aria-labelledby="signup-time-limit-title"
          >
            <div className="login-page__limits-group-heading">
              <img src={iconLimiteJogoDiario} alt="" className="login-page__limits-group-icon" aria-hidden="true" />
              <h2 className="login-page__limits-group-title" id="signup-time-limit-title">
                Limite de tempo de jogo diário
              </h2>
            </div>
            {renderLimitChips(gameTimeLimitOptions, selectedTimeLimit, setSelectedTimeLimit, 'time')}
          </section>

          <section className="login-page__limits-group" aria-labelledby="signup-loss-limit-title">
            <div className="login-page__limits-group-heading">
              <img src={iconLimitePerdaDiario} alt="" className="login-page__limits-group-icon" aria-hidden="true" />
              <h2 className="login-page__limits-group-title" id="signup-loss-limit-title">
                Limite de perdas diário
              </h2>
            </div>
            {renderLimitChips(lossLimitOptions, selectedLossLimit, setSelectedLossLimit, 'loss')}
          </section>
        </div>
      </div>

      <footer className="login-page__limits-footer">
        <div className="login-page__limits-footer-content">
          <p className="login-page__limits-footer-note">
            Você pode alterar esses limites em “Minha conta” &gt; “Jogo Responsável”.
          </p>
          <PrimaryButton
            type="button"
            disabled={isSignupActionLoading}
            isLoading={signupLoadingAction === 'limits-save'}
            onClick={handleLimitsSave}
          >
            Salvar limites
          </PrimaryButton>
        </div>
      </footer>
    </section>
  )

  const renderLimitsCustomBottomSheet = () => {
    if (activeCustomLimitSheet === null) return null

    const isTimeLimitSheet = activeCustomLimitSheet === 'time'
    const title = isTimeLimitSheet ? 'Limite de tempo de jogo diário' : 'Limite de perdas diário'
    const description = isTimeLimitSheet
      ? 'Insira outro valor para seu limite de tempo de jogo diário.'
      : 'Insira outro valor para seu limite de perdas diário.'
    const isTimeLimitMinutesDisabled = customTimeLimitHoursInput === '24'
    const isValueValid = isTimeLimitSheet
      ? isCustomTimeLimitValid(customTimeLimitHoursInput, customTimeLimitMinutesInput)
      : parseCurrencyLimitCents(customLossLimitInput) > 0
    const handleCustomTimeLimitHoursChange = (value: string) => {
      const nextHours = normalizeTimeLimitHoursInput(value)

      setCustomTimeLimitHoursInput(nextHours)

      if (nextHours === '24') {
        setCustomTimeLimitMinutesInput('')
      }
    }
    const handleCustomTimeLimitMinutesChange = (value: string) => {
      if (isTimeLimitMinutesDisabled) return

      setCustomTimeLimitMinutesInput(normalizeTimeLimitMinutesInput(value))
    }
    // Foca já no pointerdown: a troca horas ↔ minutos vira um único passo de foco,
    // sem o teclado do iOS piscar/reposicionar a sheet no gap entre blur e focus.
    const handleLimitShellPointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return

      const input = event.currentTarget.querySelector('input')

      if (!input || input.disabled) return
      if (document.activeElement === input) return

      event.preventDefault()
      input.focus({ preventScroll: true })
    }

    return (
      <BottomSheet
        isOpen={isCustomLimitSheetOpen}
        onClose={closeCustomLimitSheet}
        title={title}
        leadingContent={<span className="login-limits-custom-sheet__header-spacer" aria-hidden="true" />}
        containerClassName="login-page__bottom-sheet-container"
        sheetClassName="login-limits-custom-sheet"
        bodyClassName="login-limits-custom-sheet__body"
        blurBackdrop
        footerContent={(
          <PrimaryButton
            type="button"
            disabled={!isValueValid || isSignupActionLoading}
            isLoading={signupLoadingAction === 'custom-limit'}
            onClick={handleCustomLimitSubmit}
          >
            Continuar
          </PrimaryButton>
        )}
        hideScrollIndicator
      >
        <form
          className="login-limits-custom-form"
          onSubmit={(event) => {
            event.preventDefault()
            handleCustomLimitSubmit()
          }}
        >
          <p className="login-limits-custom-form__description">{description}</p>
          {isTimeLimitSheet ? (
            <div className="login-limits-custom-form__time-row">
              <label className="login-limits-custom-form__field">
                <span className="login-page__sr-only">Horas do limite de tempo de jogo diário</span>
                <span className="login-limits-custom-form__input-shell" onPointerDown={handleLimitShellPointerDown}>
                  <input
                    className="login-limits-custom-form__input"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customTimeLimitHoursInput}
                    placeholder="0"
                    aria-label="Horas do limite de tempo de jogo diário"
                    onChange={(event) => handleCustomTimeLimitHoursChange(event.target.value)}
                  />
                  <span className="login-limits-custom-form__affix" aria-hidden="true">horas</span>
                </span>
              </label>
              <label className="login-limits-custom-form__field">
                <span className="login-page__sr-only">Minutos do limite de tempo de jogo diário</span>
                <span
                  className={[
                    'login-limits-custom-form__input-shell',
                    isTimeLimitMinutesDisabled ? 'login-limits-custom-form__input-shell--disabled' : '',
                  ].filter(Boolean).join(' ')}
                  onPointerDown={handleLimitShellPointerDown}
                >
                  <input
                    className="login-limits-custom-form__input"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customTimeLimitMinutesInput}
                    placeholder="0"
                    aria-label="Minutos do limite de tempo de jogo diário"
                    disabled={isTimeLimitMinutesDisabled}
                    onChange={(event) => handleCustomTimeLimitMinutesChange(event.target.value)}
                  />
                  <span className="login-limits-custom-form__affix" aria-hidden="true">minutos</span>
                </span>
              </label>
            </div>
          ) : (
            <label className="login-limits-custom-form__field">
              <span className="login-page__sr-only">{title}</span>
              <span className="login-limits-custom-form__input-shell" onPointerDown={handleLimitShellPointerDown}>
                <span className="login-limits-custom-form__affix" aria-hidden="true">R$</span>
                <input
                  className="login-limits-custom-form__input"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customLossLimitInput}
                  placeholder="0,00"
                  aria-label={description}
                  onChange={(event) => setCustomLossLimitInput(formatCurrencyLimitInput(event.target.value))}
                />
              </span>
            </label>
          )}
        </form>
      </BottomSheet>
    )
  }

  const renderVerification = () => {
    if (verificationStage === 'document-front' || verificationStage === 'document-back' || verificationStage === 'face') {
      return renderVerificationCapture(verificationStage)
    }

    if (verificationStage === 'loading') return renderVerificationLoading()
    if (verificationStage === 'limits') return renderVerificationLimits()

    return renderVerificationIntro()
  }

  const renderSignup = () => {
    if (signupStep === 'verification') return renderVerification()
    if (signupStep === 'address') return renderSignupAddress()
    if (signupStep === 'personal') return renderSignupPersonal()

    return renderSignupAccount()
  }

  const signupStepMotionClassName = [
    'login-page__signup-step-motion',
    signupStepMotionPhase !== 'idle' ? `login-page__signup-step-motion--${signupStepMotionPhase}` : '',
  ].filter(Boolean).join(' ')
  const authModeMotionClassName = [
    'login-page__auth-mode-motion',
    authModeMotionPhase !== 'idle' ? `login-page__auth-mode-motion--${authModeMotionPhase}` : '',
  ].filter(Boolean).join(' ')

  return (
    <main
      ref={loginPageRef}
      className={[
        'login-page',
        `login-page--${motionState}`,
        overlayVariant === 'over-betslip' ? 'login-page--over-betslip' : '',
        displayedMode === 'signup' ? 'login-page--signup' : '',
        isSignupBottomSheetOpen ? 'login-page--sheet-open' : '',
        displayedMode === 'signup' && signupStep === 'verification' ? 'login-page--verification' : '',
      ].filter(Boolean).join(' ')}
      data-motion={motionState}
    >
      <div className="login-page__scrim" aria-hidden="true" />
      <div className="login-page__surface" onAnimationEnd={handleSurfaceAnimationEnd}>
        <div className={authModeMotionClassName}>
          {displayedMode === 'signup' ? (
            <>
              {signupStep !== 'verification' ? <AuthHeader activeStep={signupStep} onBack={handleBack} /> : null}
              <div key={signupStep} className={signupStepMotionClassName}>
                {renderSignup()}
              </div>
            </>
          ) : renderLogin()}
        </div>
      </div>
      {displayedMode === 'signup' && signupStep === 'personal' ? renderPhoneValidationBottomSheet() : null}
      {displayedMode === 'signup' && signupStep === 'address' ? renderUnknownCepBottomSheet() : null}
      {displayedMode === 'signup' && signupStep === 'address' ? renderRegionBottomSheet() : null}
      {displayedMode === 'signup' && signupStep === 'address' ? renderCityBottomSheet() : null}
      {displayedMode === 'signup' && signupStep === 'verification' && verificationStage === 'limits'
        ? renderLimitsCustomBottomSheet()
        : null}
      <SignupExitConfirmModal
        isOpen={isSignupExitConfirmOpen}
        onClose={handleSignupExitConfirmClose}
        onExit={handleSignupExitConfirm}
        primaryLabel={signupExitRequirement === 'identity' ? 'Verificar minha identidade' : 'Definir limites'}
        message={signupExitRequirement === 'identity'
          ? 'Para começar a jogar, você precisa verificar sua identidade. Sem isso, não é possível criar apostas ou jogar em cassino.'
          : 'Para começar a jogar, você precisa definir limites de jogo. Sem isso, não é possível criar apostas ou jogar em cassino.'}
      />
    </main>
  )
}
