import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.haseebflix.mobile',
  appName: 'Flickora',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
