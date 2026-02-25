import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.nevha.app',
  appName: 'NEVHA',
  webDir: 'www',
  server: {
    url: 'https://nevha.org',
    cleartext: true
  }
};

export default config;
