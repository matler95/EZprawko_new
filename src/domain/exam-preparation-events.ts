const listeners = new Set<() => void>();
export const subscribePreparedExam = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const examPreferencesChanged = () => { for (const listener of listeners) listener(); };
