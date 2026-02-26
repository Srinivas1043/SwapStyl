
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../lib/i18n';
import { getLocales } from 'expo-localization';

type LanguageContextType = {
  locale: string;
  setLocale: (locale: string) => Promise<void>;
  isLoading: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState(i18n.locale);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('user-language');
        if (storedLang) {
          i18n.locale = storedLang;
          setLocaleState(storedLang);
        } else {
            // Fallback to device locale if not set
            const deviceLocale = getLocales()[0]?.languageCode;
            if (deviceLocale) {
                 i18n.locale = deviceLocale;
                 setLocaleState(deviceLocale);
            }
        }
      } catch (e) {
        console.error('Failed to load language', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadLanguage();
  }, []);

  const setLocale = async (newLocale: string) => {
    try {
      i18n.locale = newLocale;
      setLocaleState(newLocale);
      await AsyncStorage.setItem('user-language', newLocale);
    } catch (e) {
      console.error('Failed to set language', e);
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
