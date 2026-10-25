import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { AuthProvider } from '@/context/AuthContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <title>CheckU • Control de Asistencia Universitario</title>
        <meta name="description" content="Sistema de control de asistencia universitaria con código QR dinámico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/assets/logo.png" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
