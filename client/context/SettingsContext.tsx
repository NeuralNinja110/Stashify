import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/lib/i18n';

interface SettingsContextType {
  fontSize: number;
  language: 'en' | 'ta';
  highContrast: boolean;
  setFontSize: (size: number) => void;
  setLanguage: (lang: 'en' | 'ta') => void;
  setHighContrast: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_KEY = '@stashify_settings';

const defaultSettings = {
  fontSize: 1,
  language: 'en' as const,
  highContrast: false,
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState(defaultSettings.fontSize);
  const [language, setLanguageState] = useState<'en' | 'ta'>(defaultSettings.language);
  const [highContrast, setHighContrastState] = useState(defaultSettings.highContrast);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        setFontSizeState(settings.fontSize ?? defaultSettings.fontSize);
        setLanguageState(settings.language ?? defaultSettings.language);
        setHighContrastState(settings.highContrast ?? defaultSettings.highContrast);
        i18n.changeLanguage(settings.language ?? defaultSettings.language);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<typeof defaultSettings>) => {
    try {
      const current = { fontSize, language, highContrast };
      const updated = { ...current, ...newSettings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const setFontSize = (size: number) => {
    setFontSizeState(size);
    saveSettings({ fontSize: size });
  };

  const setLanguage = (lang: 'en' | 'ta') => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    saveSettings({ language: lang });
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    saveSettings({ highContrast: enabled });
  };

  return (
    <SettingsContext.Provider
      value={{
        fontSize,
        language,
        highContrast,
        setFontSize,
        setLanguage,
        setHighContrast,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
