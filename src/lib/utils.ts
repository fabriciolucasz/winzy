import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Remove apenas caracteres não-numéricos
 */
export const onlyDigits = (value: string): string => {
  return value.replace(/\D/g, '');
}

/**
 * Formata CPF progressivamente durante a digitação
 * Entrada: "12345678910" -> Saída: "123.456.789-10"
 */
export const formatCPFInput = (value: string): string => {
  const cleaned = onlyDigits(value);

  // Formata enquanto digita
  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  } else if (cleaned.length <= 9) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  } else {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  }
}

/**
 * Formata CPF - versão final
 */
export const formatCPF = (cpf: string): string => {
  const cleanedCPF = onlyDigits(cpf);
  if (cleanedCPF.length !== 11) return cpf;

  return cleanedCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata telefone progressivamente durante a digitação
 * 11 dígitos: "(11) 99999-9999"
 * 10 dígitos: "(11) 9999-9999"
 */
export const formatPhoneInput = (value: string): string => {
  const cleaned = onlyDigits(value);

  if (cleaned.length <= 2) {
    return cleaned.length > 0 ? `(${cleaned}` : '';
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  } else if (cleaned.length <= 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  } else {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  }
}

export const formatPhone = (phone: string): string => {
  const cleanedPhone = onlyDigits(phone);
  if (cleanedPhone.length === 11) {
    return cleanedPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleanedPhone.length === 10) {
    return cleanedPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatRaffleCreatedAt(dateInput: string | Date): string {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return 'Criada em data invalida';
  }

  return `Criada em ${date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })}`;
}