import type { ToolDef } from './types';
import { ok, measure } from '@/lib/result';
import { resolveElement, scrollIntoView } from '@/lib/dom';

/**
 * File-handling tools.
 *
 * `upload` runs in the content context: it synthesizes a File from base64
 * content sent by the backend and assigns it to an <input type="file"> using a
 * DataTransfer (the only way to programmatically set .files in MV3).
 *
 * `download` / `downloadStatus` run in the background (chrome.downloads).
 */

function b64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}

export const fileTools: ToolDef[] = [
  {
    name: 'upload',
    description: 'Attach a file to an <input type="file">. Pass base64 `content`, `filename`, optional `mimeType`.',
    context: 'content',
    args: {
      selector: { type: 'string', required: true },
      filename: { type: 'string', required: true },
      content: { type: 'string', description: 'base64-encoded file content' },
      mimeType: { type: 'string' },
    },
    handler: async (args) =>
      measure('upload', args.id as string | undefined, async () => {
        const el = (await resolveElement(args.selector as string)) as HTMLInputElement;
        if (el.tagName !== 'INPUT' || el.type !== 'file') {
          throw new Error('Target is not an <input type="file">');
        }
        scrollIntoView(el);
        const blob = b64ToBlob(
          (args.content as string) ?? '',
          (args.mimeType as string) ?? 'application/octet-stream',
        );
        const file = new File([blob], args.filename as string, { type: blob.type });
        const dt = new DataTransfer();
        dt.items.add(file);
        el.files = dt.files;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return ok('upload', { filename: file.name, size: file.size, type: file.type });
      }),
  },
];

/**
 * Background file tools. These are registered from the background context where
 * `chrome.downloads` is available; the handlers close over a tracker map.
 */
export function makeBackgroundFileTools(
  downloads: Map<string, { state: string; filename?: string; url: string }>,
): ToolDef[] {
  return [
    {
      name: 'download',
      description: 'Download a URL to the user\'s Downloads folder. Returns a download id.',
      context: 'background',
      args: { url: { type: 'string', required: true }, filename: { type: 'string' } },
      handler: async (args, ctx) =>
        measure('download', ctx.id, async () => {
          const url = args.url as string;
          const opts: chrome.downloads.DownloadOptions = { url };
          if (args.filename) opts.filename = args.filename as string;
          const id = await new Promise<number>((resolve, reject) => {
            chrome.downloads.download(opts, (dlId) => {
              const err = chrome.runtime.lastError;
              if (err) reject(new Error(err.message));
              else resolve(dlId);
            });
          });
          downloads.set(String(id), { state: 'in_progress', url });
          return ok('download', { id: String(id), url });
        }),
    },
    {
      name: 'downloadStatus',
      description: 'Check the status of a download by id.',
      context: 'background',
      args: { id: { type: 'string', required: true } },
      handler: async (args, ctx) =>
        measure('downloadStatus', ctx.id, async () => {
          const id = Number(args.id);
          const item = await new Promise<chrome.downloads.DownloadItem | undefined>((resolve) => {
            chrome.downloads.search({ id }, (items) => resolve(items[0]));
          });
          if (!item) {
            const cached = downloads.get(String(id));
            return ok('downloadStatus', { id: String(id), state: cached?.state ?? 'unknown' });
          }
          downloads.set(String(id), {
            state: item.state,
            filename: item.filename,
            url: item.url,
          });
          return ok('downloadStatus', {
            id: String(id),
            state: item.state,
            filename: item.filename,
            exists: item.exists,
            totalBytes: item.totalBytes,
          });
        }),
    },
  ];
}
