import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { IS_TAURI } from '../config';
import { v4 as uuidv4 } from 'uuid';

export interface FileAsset {
    id: string;         // Unique ID for React keys
    name: string;       // Filename
    path?: string;      // Absolute path (Desktop only)
    file?: File;        // File object (Web only)
    preview?: string;   // Preview URL (Blob or File URL)
    size?: number;
    type?: string;      // MIME type
}

interface PickOptions {
    multiple?: boolean;
    accept?: string[]; // e.g. ['image/*', '.pdf'] or ['png', 'jpg'] depends on platform
    description?: string; // for Desktop filter name
}

export const pickFiles = async (options: PickOptions): Promise<FileAsset[]> => {
    if (IS_TAURI) {
        // TAURI MODE
        const filters = options.accept ? [{
            name: options.description || 'Files',
            extensions: options.accept.map(ext => ext.replace(/^\./, '').replace(/\/\*$/, '')) // naïve cleanup
        }] : [];

        try {
            const selected = await open({
                multiple: options.multiple !== false,
                filters: filters.length > 0 ? filters : undefined
            });

            if (!selected) return [];

            const paths = Array.isArray(selected) ? selected : [selected];

            // Map to assets (we only have path and name mainly)
            return paths.map(path => {
                // simple name extraction (windows/unix)
                const name = path.split(/[\\/]/).pop() || 'unknown';
                return {
                    id: uuidv4(),
                    path,
                    name,
                    // We don't read size/type yet for perf, assume done later or by python
                };
            });
        } catch (e) {
            console.error("Tauri file selection failed", e);
            return [];
        }

    } else {
        // WEB MODE
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = options.multiple !== false;

            // Convert simple extensions to MIME or comma list
            // e.g. ['png', 'jpg'] -> '.png,.jpg'
            if (options.accept) {
                input.accept = options.accept.map(a => a.startsWith('.') ? a : `.${a}`).join(',');
            }

            input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (!files) {
                    resolve([]);
                    return;
                }

                const assets: FileAsset[] = Array.from(files).map(f => ({
                    id: uuidv4(),
                    name: f.name,
                    file: f,
                    size: f.size,
                    type: f.type,
                    preview: URL.createObjectURL(f) // Instant preview for web
                }));
                resolve(assets);
            };

            input.click();
        });
    }
};

export const readFileAsset = async (asset: FileAsset): Promise<Uint8Array> => {
    if (IS_TAURI && asset.path) {
        return await readFile(asset.path);
    } else if (asset.file) {
        const buffer = await asset.file.arrayBuffer();
        return new Uint8Array(buffer);
    }
    throw new Error("Cannot read file: invalid asset");
};

export const getAssetUrl = (asset: FileAsset): string => {
    if (asset.preview) return asset.preview;
    // For Desktop, we might need `convertFileSrc` from tauri if we want to show it in <img src>
    // But usually we read it and make a blob url for consistency
    return '';
};
