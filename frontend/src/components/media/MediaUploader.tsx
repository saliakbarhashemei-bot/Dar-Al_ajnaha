import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mediaApi } from '@/services/media';

const CLIENT_RULES: Record<string, { mime: string[]; maxSize: number }> = {
  'Book Cover': { mime: ['image/jpeg', 'image/png', 'image/webp'], maxSize: 5 * 1024 * 1024 },
  'Book Image': { mime: ['image/jpeg', 'image/png', 'image/webp'], maxSize: 5 * 1024 * 1024 },
  'Person Photo': { mime: ['image/jpeg', 'image/png', 'image/webp'], maxSize: 3 * 1024 * 1024 },
  'Announcement Image': { mime: ['image/jpeg', 'image/png', 'image/webp'], maxSize: 5 * 1024 * 1024 },
  'Publisher Logo': { mime: ['image/svg+xml', 'image/png'], maxSize: 1024 * 1024 },
  Document: { mime: ['application/pdf'], maxSize: 20 * 1024 * 1024 },
};

export default function MediaUploader({ onUploaded }: { onUploaded?: () => void }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [mediaType, setMediaType] = useState('Book Cover');
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { t } = useTranslation();

  const validate = (list: FileList): string[] => {
    const rule = CLIENT_RULES[mediaType] ?? { mime: [] as string[], maxSize: 0 };
    const problems: string[] = [];
    Array.from(list).forEach((f) => {
      if (!rule.mime.includes(f.type)) {
        problems.push(t('media.mimeError', { name: f.name, mime: f.type || 'unknown', type: mediaType }));
      }
      if (f.size > rule.maxSize) {
        problems.push(t('media.sizeError', { name: f.name, max: Math.round(rule.maxSize / 1024 / 1024) }));
      }
    });
    return problems;
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    const problems = validate(files);
    setErrors(problems);
    if (problems.length > 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const form = new FormData();
        form.append('file', f);
        form.append('media_type', mediaType);
        await mediaApi.upload(form);
      }
      setFiles(null);
      onUploaded?.();
    } catch {
      setErrors([t('media.uploadError')]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div>
        <label htmlFor="uploader-media-type">{t('media.mediaType')}</label>
        <select id="uploader-media-type" value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
          {Object.keys(CLIENT_RULES).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          setFiles(e.dataTransfer.files);
        }}
        style={{ border: dragOver ? '2px solid green' : '2px dashed gray', padding: 16 }}
      >
        <p>{dragOver ? t('media.dropActive') : t('media.dropHint')}</p>
        <input
          aria-label={t('media.chooseFiles')}
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
        />
      </div>
      {errors.length > 0 && (
        <ul>
          {errors.map((err, i) => (
            <li key={i} role="alert">
              {err}
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={handleUpload} disabled={uploading || !files}>
        {uploading ? t('common.uploading') : t('common.upload')}
      </button>
    </div>
  );
}
