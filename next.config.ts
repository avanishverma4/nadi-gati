import type {NextConfig} from 'next';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // The default reloads the page whenever the connection comes back, which on a patchy signal
  // wipes a half-written flood report. Pages pick up fresh data on their own instead.
  reloadOnOnline: false,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['motion'],
  async headers() {
    const securityHeaders = [
      {key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains'},
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      // No other site may show Nadi-Gati in a frame (stops clickjacking, e.g. a fake page over
      // the report form). X-Frame-Options covers older browsers.
      {key: 'Content-Security-Policy', value: "frame-ancestors 'self'"},
      {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
      {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
      // Location is used for "Use my location"; nothing else needs device features
      {key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()'},
    ];
    return [
      {source: '/:path*', headers: securityHeaders},
      // Unsubscribe links carry a secret token in the URL: never send it on as a referrer
      {source: '/alerts/unsubscribe', headers: [{key: 'Referrer-Policy', value: 'no-referrer'}]},
      {source: '/unsubscribe', headers: [{key: 'Referrer-Policy', value: 'no-referrer'}]},
    ];
  },
};

export default withSerwist(nextConfig);
