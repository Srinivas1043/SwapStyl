import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

// Set the key-value pairs for the different languages you want to support.
const i18n = new I18n({
  en: {
    welcome: 'Welcome',
    login: 'Log In',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    sendResetLink: 'Send Reset Link',
    chat: 'Chat',
    profile: 'Profile',
    settings: 'Settings',
    search: 'Search',
    upload: 'Upload',
    home: 'Home',
    // Add more strings as needed
  },
  nl: {
    welcome: 'Welkom',
    login: 'Inloggen',
    signup: 'Aanmelden',
    email: 'E-mail',
    password: 'Wachtwoord',
    forgotPassword: 'Wachtwoord vergeten?',
    sendResetLink: 'Stuur reset link',
    chat: 'Chat',
    profile: 'Profiel',
    settings: 'Instellingen',
    search: 'Zoeken',
    upload: 'Uploaden',
    home: 'Thuis',
  },
  it: {
    welcome: 'Benvenuto',
    login: 'Accedi',
    signup: 'Iscriviti',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Password dimenticata?',
    sendResetLink: 'Invia link di reset',
    chat: 'Chat',
    profile: 'Profilo',
    settings: 'Impostazioni',
    search: 'Cerca',
    upload: 'Carica',
    home: 'Home',
  },
});

// Set the locale once at the beginning of your app.
i18n.locale = getLocales()[0].languageCode ?? 'en';

// Enable fallback if you want 'en' to be used when a translation is missing.
i18n.enableFallback = true;

export default i18n;
