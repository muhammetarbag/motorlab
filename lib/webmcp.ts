import { limits, type Parameters } from './engine.ts';
export type LabConfiguration = Partial<Parameters> & {
  angle?: number;
  running?: boolean;
};
export function validateConfiguration(input: unknown): LabConfiguration {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Bir ayar nesnesi gerekli.');
  const out: LabConfiguration = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'running') {
      if (typeof value !== 'boolean')
        throw new Error('running bir boolean olmalı.');
      out.running = value;
      continue;
    }
    if (key === 'angle') {
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 720
      )
        throw new Error('Krank açısı 0–720° olmalı.');
      out.angle = value;
      continue;
    }
    if (!(key in limits)) throw new Error('Bilinmeyen parametre.');
    const name = key as keyof Parameters,
      [min, max] = limits[name];
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      throw new Error(`${key} ${min}–${max} aralığında olmalı.`);
    out[name] = value;
  }
  return out;
}
export function registerLabTool(apply: (v: LabConfiguration) => void) {
  const context = (
    document as Document & {
      modelContext?: {
        registerTool: (
          t: object,
          o: { signal: AbortSignal },
        ) => void | Promise<void>;
      };
    }
  ).modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: 'configure_engine_lab',
          title: 'Motor laboratuvarını ayarla',
          description:
            'Motor parametrelerini, krank açısını ve oynatmayı birlikte ayarlar. Ekrandaki motor ve sonuçları günceller.',
          inputSchema: {
            type: 'object',
            properties: {
              ...Object.fromEntries(
                Object.entries(limits).map(([key, [min, max]]) => [
                  key,
                  { type: 'number', minimum: min, maximum: max },
                ]),
              ),
              angle: { type: 'number', minimum: 0, maximum: 720 },
              running: { type: 'boolean' },
            },
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: async (input: unknown) => {
            const value = validateConfiguration(input);
            apply(value);
            return { applied: value };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {
    /* Optional browser feature. */
  }
  return () => lifecycle.abort();
}
