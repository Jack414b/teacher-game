import { create } from 'zustand';
import type { User } from '../types';

interface GameState {
  // 用户数据
  user: User | null;
  setUser: (user: User) => void;
  updateBeans: (small: number, big: number) => void;
  useSpinChance: () => void;
  addSpinChances: (n: number) => void;

  // UI 状态
  isBossMode: boolean;
  setBossMode: (v: boolean) => void;

  // 任务刷新触发器
  taskVersion: number;
  bumpTaskVersion: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateBeans: (small, big) =>
    set((s) => ({
      user: s.user
        ? { ...s.user, beans_small: s.user.beans_small + small, beans_big: s.user.beans_big + big }
        : null,
    })),
  useSpinChance: () =>
    set((s) => ({
      user: s.user
        ? { ...s.user, spin_chances: Math.max(0, s.user.spin_chances - 1) }
        : null,
    })),
  addSpinChances: (n) =>
    set((s) => ({
      user: s.user
        ? { ...s.user, spin_chances: s.user.spin_chances + n }
        : null,
    })),

  isBossMode: false,
  setBossMode: (v) => set({ isBossMode: v }),

  taskVersion: 0,
  bumpTaskVersion: () => set(s => ({ taskVersion: s.taskVersion + 1 })),
}));
