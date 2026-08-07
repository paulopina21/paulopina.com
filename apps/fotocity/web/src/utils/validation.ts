// Regras de validação do formulário de conclusão de envio.
// Sem React e sem DOM: as regras podem ser lidas — e testadas depois — sozinhas.

export type UploadField = 'tamanho' | 'nome' | 'email' | 'whats'

export type FieldErrors = Partial<Record<UploadField, string>>

export interface UploadFormValues {
  tamanho: string
  nome: string
  email: string
  whats: string
}

// Ordem em que os campos são lidos na tela. O foco após uma tentativa falha segue
// essa sequência, então ela mora ao lado das regras para as duas não se desencontrarem.
export const FIELD_ORDER: UploadField[] = ['tamanho', 'nome', 'email', 'whats']

// Todo celular brasileiro tem 11 dígitos com DDD. O campo é WhatsApp, então
// telefone fixo (10 dígitos) é recusado de propósito.
const WHATS_MIN_DIGITS = 11

export function validateUploadForm(v: UploadFormValues): FieldErrors {
  const errors: FieldErrors = {}

  if (!v.tamanho.trim()) {
    errors.tamanho = 'Selecione o tamanho das fotos'
  }

  if (v.nome.trim().length < 2) {
    errors.nome = 'Preencha seu nome'
  }

  const email = v.email.trim()
  if (!email) {
    errors.email = 'Preencha seu e-mail'
  } else if (!/.+@.+\..+/.test(email)) {
    errors.email = 'E-mail inválido — confira se tem @ e ponto'
  }

  const digits = v.whats.replace(/\D/g, '')
  if (!digits) {
    errors.whats = 'Preencha seu WhatsApp'
  } else if (digits.length < WHATS_MIN_DIGITS) {
    errors.whats = 'Digite o DDD e o número completo'
  }

  return errors
}

export function firstInvalidField(errors: FieldErrors): UploadField | null {
  return FIELD_ORDER.find(field => errors[field]) ?? null
}
