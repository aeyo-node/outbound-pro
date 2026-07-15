import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json';

/**
 * Manifest V3 configuration.
 *
 * host_permissions cover the dashboard(s) the extension may automate. The
 * extension only acts on the dashboard URL the operator configures plus
 * explicit openPage() targets that the backend requests. Operators can narrow
 * host_permissions further in production builds.
 */
const manifest = defineManifest({
  manifest_version: 3,
  name: 'Swaram Browser Assistant',
  version: pkg.version,
  description:
    'Browser execution layer for SwaramAI Voice Agents. Exposes any dashboard as callable tools over a secure WebSocket.',
  minimum_chrome_version: '116',
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Swaram Browser Assistant',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  permissions: [
    'storage',
    'tabs',
    'scripting',
    'activeTab',
    'alarms',
    'cookies',
    'downloads',
    'notifications',
    'debugger',
  ],
  host_permissions: ['http://*/*', 'https://*/*'],
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'self'; connect-src 'self' wss: ws: https: http:;",
  },
  web_accessible_resources: [
    {
      resources: ['icons/*'],
      matches: ['<all_urls>'],
    },
  ],
});

export default manifest;
