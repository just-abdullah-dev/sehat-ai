import { useLanguageContext } from '@/src/context/LanguageProvider';

export const useLanguage = () => {
  return useLanguageContext();
};
