import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  ];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
        <Globe className="w-5 h-5 text-gray-600" />
        <span className="text-sm text-gray-700">
          {languages.find(l => l.code === i18n.language)?.flag || '🌐'}
        </span>
      </button>

      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition first:rounded-t-lg last:rounded-b-lg ${
              i18n.language === language.code ? 'bg-blue-50' : ''
            }`}
          >
            <span className="text-xl">{language.flag}</span>
            <span className="text-sm font-medium text-gray-700">{language.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
