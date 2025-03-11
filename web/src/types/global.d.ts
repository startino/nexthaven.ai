interface Window {
  dataLayer: any[];
  gtag: (command: string, id: string, config: object) => void;
}

type Screen = 'home' | 'search' | 'loading' | 'compare' | 'history' | 'booking'; 