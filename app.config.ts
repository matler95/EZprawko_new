import type { ConfigContext, ExpoConfig } from 'expo/config';

// The real project UUID belongs in app.json -> expo.extra.eas.projectId after
// linking the owner's EAS project. Never invent a UUID or ship a placeholder URL.
export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const projectId = config.extra?.eas?.projectId;
  if (projectId !== undefined && (typeof projectId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId))) {
    throw new Error('Set a real EAS UUID in app.json: expo.extra.eas.projectId.');
  }
  if (process.env.EAS_BUILD === 'true' && !projectId) {
    throw new Error('Link the real Expo/EAS project before starting a cloud build.');
  }
  return {
    ...config,
    name: config.name ?? 'EZprawko',
    slug: config.slug ?? 'EZprawko_new',
    runtimeVersion: { policy: 'fingerprint' },
    updates: {
      ...config.updates,
      enabled: Boolean(projectId),
      url: projectId ? `https://u.expo.dev/${projectId}` : undefined,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
      useEmbeddedUpdate: true,
    },
  };
}
