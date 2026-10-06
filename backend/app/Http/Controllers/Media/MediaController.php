<?php

namespace App\Http\Controllers\Media;

use App\Http\Controllers\Concerns\PaginatesRequests;
use App\Http\Controllers\Controller;
use App\Http\Requests\Media\ReplaceMediaRequest;
use App\Http\Requests\Media\StoreMediaRequest;
use App\Http\Requests\Media\UpdateMediaRequest;
use App\Http\Resources\MediaResource;
use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Book;
use App\Models\Contributor;
use App\Models\Media;
use App\Models\Mediable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse as Response;

class MediaController extends Controller
{
    use PaginatesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Media::class);

        $query = Media::query()
            ->with('uploader')
            ->searchColumns(['file_name', 'alt_text', 'caption', 'description'], $request->input('q'))
            ->when($request->input('mime_type'), fn ($q) => $q->where('mime_type', $request->input('mime_type')))
            ->when($request->input('media_type'), fn ($q) => $q->whereIn('id', function ($inner) use ($request) {
                $inner->select('media_id')->from('mediables')->where('media_type', $request->input('media_type'));
            }))
            ->when($request->input('mediable_type'), fn ($q) => $q->whereIn('id', function ($inner) use ($request) {
                $inner->select('media_id')->from('mediables')->where('mediable_type', $request->input('mediable_type'));
            }));

        if ($request->has('is_archived')) {
            $query->where('is_archived', $request->boolean('is_archived'));
        } else {
            $query->where('is_archived', false);
        }

        return MediaResource::collection($query->paginate($this->perPage($request)));
    }

    public function show(Request $request, Media $media): JsonResponse
    {
        $this->authorize('view', $media);

        return response()->json([
            'data' => new MediaResource($media->load('uploader')),
        ]);
    }

    public function store(StoreMediaRequest $request): JsonResponse
    {
        $this->authorize('create', Media::class);

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $disk = config('filesystems.default', 'local');

        $media = $this->persistFile($file, $disk, [
            'alt_text' => $request->input('alt_text'),
            'caption' => $request->input('caption'),
            'description' => $request->input('description'),
            'uploaded_by' => $request->user()->id,
        ]);

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'media.upload',
            'entity_type' => 'media',
            'entity_id' => $media->id,
            'metadata' => ['media_type' => $request->input('media_type'), 'mime_type' => $media->mime_type],
        ]);

        return response()->json([
            'data' => new MediaResource($media),
        ], 201);
    }

    public function update(UpdateMediaRequest $request, Media $media): JsonResponse
    {
        $this->authorize('update', $media);

        $media->update($request->validated());

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'media.update',
            'entity_type' => 'media',
            'entity_id' => $media->id,
        ]);

        return response()->json([
            'data' => new MediaResource($media),
        ]);
    }

    public function replace(ReplaceMediaRequest $request, Media $media): JsonResponse
    {
        $this->authorize('replace', $media);

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $disk = $media->disk;

        Storage::disk($disk)->delete($media->path);

        $attributes = $this->fileAttributes($file);
        $path = $this->storeFile($file, $disk);

        $media->update([
            'path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $attributes['mime_type'],
            'size' => $attributes['size'],
            'width' => $attributes['width'],
            'height' => $attributes['height'],
        ]);

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'media.replace',
            'entity_type' => 'media',
            'entity_id' => $media->id,
            'metadata' => ['media_type' => $request->input('media_type'), 'mime_type' => $media->mime_type],
        ]);

        return response()->json([
            'data' => new MediaResource($media),
        ]);
    }

    public function archive(Request $request, Media $media): JsonResponse
    {
        $this->authorize('archive', $media);

        if ($media->is_archived) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'media', 'message' => 'Media is already archived']],
            ], 422);
        }

        $media->update(['is_archived' => true]);

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'media.archive',
            'entity_type' => 'media',
            'entity_id' => $media->id,
        ]);

        return response()->json([
            'data' => new MediaResource($media),
        ]);
    }

    public function attachments(Request $request, Media $media): JsonResponse
    {
        $this->authorize('view', $media);

        $rows = Mediable::where('media_id', $media->id)->get();

        // Resolve every parent in one query per type instead of one query
        // per attachment row.
        $parents = $this->resolveAttachmentParents($rows);

        $data = $rows->map(function (Mediable $row) use ($parents) {
            $meta = $parents[$row->mediable_type][$row->mediable_id] ?? null;

            return [
                'id' => $row->id,
                'mediable_type' => $row->mediable_type,
                'mediable_id' => $row->mediable_id,
                'media_type' => $row->media_type,
                'title' => $meta['title'] ?? null,
                'link' => $meta['link'] ?? null,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Resolve attachment parents with one query per entity type instead of
     * one query per attachment row.
     *
     * @return array<string, array<int, array{title: string}>>
     */
    private function resolveAttachmentParents($rows): array
    {
        $grouped = $rows->groupBy('mediable_type');

        $models = [
            'Book' => [Book::withTrashed(), 'title', 'books'],
            'Contributor' => [Contributor::withTrashed(), 'name', 'contributors'],
            'Announcement' => [Announcement::withTrashed(), 'title', 'announcements'],
        ];

        $resolved = [];

        foreach ($grouped as $type => $typeRows) {
            if (! isset($models[$type])) {
                continue;
            }

            [$query, $titleColumn, $routeSegment] = $models[$type];

            $ids = $typeRows->pluck('mediable_id')->unique()->all();

            $resolved[$type] = $query
                ->whereIn('id', $ids)
                ->get(['id', $titleColumn])
                ->mapWithKeys(fn ($model) => [
                    $model->id => [
                        'title' => $model->{$titleColumn},
                        'link' => "/{$routeSegment}/{$model->id}",
                    ],
                ])
                ->all();
        }

        return $resolved;
    }

    public function file(Request $request, Media $media): Response
    {
        $this->authorize('view', $media);

        $disk = Storage::disk($media->disk);

        abort_unless($disk->exists($media->path), 404);

        // Stored paths are UUID-based and content is never mutated in place
        // (replacing a file writes a new path), so responses are immutable.
        return $disk->response($media->path, $media->file_name, [
            'Cache-Control' => 'private, max-age=31536000, immutable',
        ]);
    }

    public function destroy(Request $request, Media $media): JsonResponse
    {
        $this->authorize('delete', $media);

        if (! $media->is_archived) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'media', 'message' => 'Archive media before deleting']],
            ], 422);
        }

        Mediable::where('media_id', $media->id)->delete();
        $media->delete();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'media.delete',
            'entity_type' => 'media',
            'entity_id' => $media->id,
        ]);

        return response()->json(['data' => null]);
    }

    private function persistFile(UploadedFile $file, string $disk, array $extra): Media
    {
        $attributes = $this->fileAttributes($file);

        return Media::create(array_merge($extra, [
            'disk' => $disk,
            'path' => $this->storeFile($file, $disk),
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $attributes['mime_type'],
            'size' => $attributes['size'],
            'width' => $attributes['width'],
            'height' => $attributes['height'],
        ]));
    }

    private function storeFile(UploadedFile $file, string $disk): string
    {
        // Extension is derived from the sniffed MIME type only; a
        // client-supplied extension is never trusted for the storage path.
        $extension = $file->guessExtension();
        $name = now()->format('Y/m/').Str::uuid().($extension ? '.'.$extension : '');

        return $file->storeAs('media', $name, $disk);
    }

    private function fileAttributes(UploadedFile $file): array
    {
        $mime = $file->getMimeType();
        $width = null;
        $height = null;

        if (str_starts_with($mime, 'image/') && $mime !== 'image/svg+xml') {
            $dims = @getimagesize($file->getPathname());

            if ($dims !== false) {
                [$width, $height] = $dims;
            }
        }

        return [
            'mime_type' => $mime,
            'size' => $file->getSize(),
            'width' => $width,
            'height' => $height,
        ];
    }
}
