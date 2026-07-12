import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthStore = {
  user: AuthUser | null;
  isAuthenticated: boolean; //인증여부
  login: (user: AuthUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // localStorage에 저장될 key 이름
      storage: createJSONStorage(() => localStorage),
    }
  )
);
