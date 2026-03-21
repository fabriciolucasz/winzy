"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSession, saveSession } from '@/lib/session';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  instagramUrl?: string | null;
  telegramUrl?: string | null;
  supportUrl?: string | null;
  isActive: boolean;
  owner?: {
    name: string;
    avatarUrl: string | null;
  };
};

type Raffle = {
  id: string;
  slug?: string;
  title: string;
  description?: string | null;
  bannerUrl?: string | null;
  price: number;
  minNumbers: number;
  totalNumbers: number;
  status: 'DRAFT' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
  drawDate?: Date | null;
  nextTicketNumber: number;
  mysteryBoxEnabled: boolean;
  mysteryBoxConfig?: any;
  mysteryPrizes?: any[];
  winnerId?: string | null;
  pixText?: string | null;
};

type User = {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  role?: 'USER' | 'ADMIN';
};

interface AppContextType {
  tenant: Tenant | null;
  setTenant: React.Dispatch<React.SetStateAction<Tenant | null>>;
  raffle: Raffle | null;
  setRaffle: React.Dispatch<React.SetStateAction<Raffle | null>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAdmin: boolean;
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  ticketCount: number;
  setTicketCount: React.Dispatch<React.SetStateAction<number>>;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMysteryBoxModalOpen: boolean;
  setIsMysteryBoxModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  boxOpeningStatus: 'closed' | 'opening' | 'opened';
  setBoxOpeningStatus: React.Dispatch<React.SetStateAction<'closed' | 'opening' | 'opened'>>;
  boxPrize: string | null;
  setBoxPrize: React.Dispatch<React.SetStateAction<string | null>>;
  currentBoxTicket: any;
  setCurrentBoxTicket: React.Dispatch<React.SetStateAction<any>>;
  expandedTickets: string[];
  setExpandedTickets: React.Dispatch<React.SetStateAction<string[]>>;
  isNewUser: boolean | null;
  setIsNewUser: React.Dispatch<React.SetStateAction<boolean | null>>;
  formData: {
    name: string;
    email: string;
    birthDate: string;
    phone: string;
    confirmPhone: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    email: string;
    birthDate: string;
    phone: string;
    confirmPhone: string;
  }>>;
  cpf: string;
  setCpf: React.Dispatch<React.SetStateAction<string>>;
  cpfError: string;
  setCpfError: React.Dispatch<React.SetStateAction<string>>;
  loginCpf: string;
  setLoginCpf: React.Dispatch<React.SetStateAction<string>>;
  loginCpfError: string;
  setLoginCpfError: React.Dispatch<React.SetStateAction<string>>;
  loginEmail: string;
  setLoginEmail: React.Dispatch<React.SetStateAction<string>>;
  loginEmailError: string;
  setLoginEmailError: React.Dispatch<React.SetStateAction<string>>;
  loginUser: any;
  setLoginUser: React.Dispatch<React.SetStateAction<any>>;
  isLoginStepEmail: boolean;
  setIsLoginStepEmail: React.Dispatch<React.SetStateAction<boolean>>;
  phoneError: string;
  setPhoneError: React.Dispatch<React.SetStateAction<string>>;
  // Persistência de sessão
  saveUserSession: (user: { id?: string; name: string; email: string; phone?: string; cpf?: string; role?: 'USER' | 'ADMIN' }) => void;
  // Checkout states
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  checkoutPaymentData: {
    paymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    amount: number;
  } | null;
  setCheckoutPaymentData: React.Dispatch<React.SetStateAction<{
    paymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    amount: number;
  } | null>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children, tenant, raffle }: { children: ReactNode; tenant?: Tenant; raffle?: Raffle }) {
  const [tenantState, setTenant] = useState<Tenant | null>(tenant || null);
  const [raffleState, setRaffle] = useState<Raffle | null>(raffle || null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ticketCount, setTicketCount] = useState(raffle?.minNumbers || 1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMysteryBoxModalOpen, setIsMysteryBoxModalOpen] = useState(false);
  const [boxOpeningStatus, setBoxOpeningStatus] = useState<'closed' | 'opening' | 'opened'>('closed');
  const [boxPrize, setBoxPrize] = useState<string | null>(null);
  const [currentBoxTicket, setCurrentBoxTicket] = useState<any>(null);
  const [expandedTickets, setExpandedTickets] = useState<string[]>([]);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    birthDate: '',
    phone: '',
    confirmPhone: ''
  });
  const [cpf, setCpf] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [loginCpf, setLoginCpf] = useState('');
  const [loginCpfError, setLoginCpfError] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginUser, setLoginUser] = useState<any>(null);
  const [isLoginStepEmail, setIsLoginStepEmail] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  useEffect(() => {
    const tenantSlug = tenantState?.slug;

    if (user || !tenantSlug) {
      return;
    }

    const sessionUser = getSession();
    if (sessionUser) {
      setUser(sessionUser);
      return;
    }

    const safeTenantSlug = tenantSlug;

    let isMounted = true;

    async function hydrateUserFromCookie() {
      try {
        const response = await fetch(`/api/public/client/me?slug=${encodeURIComponent(safeTenantSlug)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          success?: boolean;
          client?: {
            id: string;
            name: string;
            email: string;
            phone?: string;
            cpf?: string;
            nickname?: string | null;
          };
        };

        if (!isMounted || !data.success || !data.client) {
          return;
        }

        const hydratedUser: User = {
          id: data.client.id,
          name: data.client.nickname || data.client.name,
          email: data.client.email,
          phone: data.client.phone,
          cpf: data.client.cpf,
          role: "USER",
        };

        saveSession(hydratedUser);
        setUser(hydratedUser);
      } catch {
        // Ignora falhas de hidratação para nao bloquear a interface.
      }
    }

    void hydrateUserFromCookie();

    return () => {
      isMounted = false;
    };
  }, [tenantState?.slug, user]);

  const saveUserSession = (userData: Parameters<typeof saveSession>[0]) => {
    saveSession(userData);
    setUser(userData);
  };
  const [checkoutPaymentData, setCheckoutPaymentData] = useState<{
    paymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    amount: number;
  } | null>(null);

  return (
    <AppContext.Provider value={{
      tenant: tenantState, setTenant,
      raffle: raffleState, setRaffle,
      user, setUser,
      isAdmin, setIsAdmin,
      ticketCount, setTicketCount,
      isModalOpen, setIsModalOpen,
      isLoginModalOpen, setIsLoginModalOpen,
      isMysteryBoxModalOpen, setIsMysteryBoxModalOpen,
      boxOpeningStatus, setBoxOpeningStatus,
      boxPrize, setBoxPrize,
      currentBoxTicket, setCurrentBoxTicket,
      expandedTickets, setExpandedTickets,
      isNewUser, setIsNewUser,
      formData, setFormData,
      cpf, setCpf,
      cpfError, setCpfError,
      loginCpf, setLoginCpf,
      loginCpfError, setLoginCpfError,
      loginEmail, setLoginEmail,
      loginEmailError, setLoginEmailError,
      loginUser, setLoginUser,
      isLoginStepEmail, setIsLoginStepEmail,
      phoneError, setPhoneError,
      saveUserSession,
      isCheckoutModalOpen, setIsCheckoutModalOpen,
      checkoutPaymentData, setCheckoutPaymentData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
}
