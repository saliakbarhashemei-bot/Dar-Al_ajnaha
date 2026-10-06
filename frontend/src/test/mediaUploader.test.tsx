import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import MediaUploader from '@/components/media/MediaUploader';
import { mediaApi } from '@/services/media';

vi.mock('@/services/media');

const mockedMedia = vi.mocked(mediaApi);

function fileOf(name: string, type: string, size = 10) {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

beforeEach(() => {
  vi.clearAllMocks();
});

test('uploads a valid image once a file is chosen', async () => {
  mockedMedia.upload.mockResolvedValue({ id: 1 } as never);
  const onUploaded = vi.fn();

  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaUploader onUploaded={onUploaded} />
      </AuthProvider>
    </MemoryRouter>,
  );

  const input = screen.getByLabelText('Choose files');
  fireEvent.change(input, { target: { files: [fileOf('cover.jpg', 'image/jpeg')] } });

  fireEvent.click(screen.getByRole('button', { name: /^upload$/i }));

  await waitFor(() => expect(mockedMedia.upload).toHaveBeenCalledTimes(1));
  expect(onUploaded).toHaveBeenCalled();
});

test('rejects a MIME type that is not allowed for the selected media type', async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaUploader />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText('Choose files'), {
    target: { files: [fileOf('doc.pdf', 'application/pdf')] },
  });
  fireEvent.click(screen.getByRole('button', { name: /^upload$/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/not allowed for Book Cover/i);
  expect(mockedMedia.upload).not.toHaveBeenCalled();
});

test('rejects a file that exceeds the size limit for its media type', async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaUploader />
      </AuthProvider>
    </MemoryRouter>,
  );

  // Person Photo is capped at 3 MB.
  fireEvent.change(screen.getByLabelText('Media type'), { target: { value: 'Person Photo' } });
  fireEvent.change(screen.getByLabelText('Choose files'), {
    target: { files: [fileOf('huge.jpg', 'image/jpeg', 4 * 1024 * 1024)] },
  });
  fireEvent.click(screen.getByRole('button', { name: /^upload$/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/exceeds 3 MB/i);
  expect(mockedMedia.upload).not.toHaveBeenCalled();
});

test('reports a server-side upload failure', async () => {
  mockedMedia.upload.mockRejectedValue(new Error('500'));

  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaUploader />
      </AuthProvider>
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText('Choose files'), {
    target: { files: [fileOf('cover.jpg', 'image/jpeg')] },
  });
  fireEvent.click(screen.getByRole('button', { name: /^upload$/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/upload failed on the server/i);
});

test('accepts a dropped file and shows the active drop hint', async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaUploader />
      </AuthProvider>
    </MemoryRouter>,
  );

  const dropzone = screen.getByText(/drag & drop files here/i).parentElement as HTMLElement;

  fireEvent.dragOver(dropzone);
  expect(await screen.findByText(/drop files here/i)).toBeInTheDocument();

  fireEvent.drop(dropzone, { dataTransfer: { files: [fileOf('cover.jpg', 'image/jpeg')] } });

  await waitFor(() => expect(screen.getByRole('button', { name: /^upload$/i })).toBeEnabled());
});

test('the upload button is disabled until a file is chosen', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <MediaUploader />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(screen.getByRole('button', { name: /^upload$/i })).toBeDisabled();
});
