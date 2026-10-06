<?php

namespace App\Http\Controllers\Media;

use App\Http\Controllers\Controller;
use App\Http\Requests\Media\AttachMediaRequest;
use App\Http\Resources\MediaResource;
use App\Models\ActivityLog;
use App\Models\Announcement;
use App\Models\Book;
use App\Models\Contributor;
use App\Models\Media;
use App\Models\Mediable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaAttachmentController extends Controller
{
    // ---- Books ----

    public function bookIndex(Request $request, Book $book): JsonResponse
    {
        $this->authorize('view', $book);

        return response()->json(['data' => $this->attachmentsFor('Book', $book->id)]);
    }

    public function bookAttach(AttachMediaRequest $request, Book $book): JsonResponse
    {
        $this->authorize('update', $book);

        return $this->attach($request, 'Book', $book->id);
    }

    public function bookDetach(Request $request, Book $book, Media $media): JsonResponse
    {
        $this->authorize('update', $book);

        return $this->detach($request, 'Book', $book->id, $media->id);
    }

    // ---- Contributors ----

    public function contributorIndex(Request $request, Contributor $contributor): JsonResponse
    {
        $this->authorize('view', $contributor);

        return response()->json(['data' => $this->attachmentsFor('Contributor', $contributor->id)]);
    }

    public function contributorAttach(AttachMediaRequest $request, Contributor $contributor): JsonResponse
    {
        $this->authorize('update', $contributor);

        return $this->attach($request, 'Contributor', $contributor->id);
    }

    public function contributorDetach(Request $request, Contributor $contributor, Media $media): JsonResponse
    {
        $this->authorize('update', $contributor);

        return $this->detach($request, 'Contributor', $contributor->id, $media->id);
    }

    // ---- Announcements ----

    public function announcementIndex(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('view', $announcement);

        return response()->json(['data' => $this->attachmentsFor('Announcement', $announcement->id)]);
    }

    public function announcementAttach(AttachMediaRequest $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('update', $announcement);

        return $this->attach($request, 'Announcement', $announcement->id);
    }

    public function announcementDetach(Request $request, Announcement $announcement, Media $media): JsonResponse
    {
        $this->authorize('update', $announcement);

        return $this->detach($request, 'Announcement', $announcement->id, $media->id);
    }

    // ---- Shared ----

    private function attach(AttachMediaRequest $request, string $alias, int $id): JsonResponse
    {
        $validated = $request->validated();

        $exists = Mediable::where('media_id', $validated['media_id'])
            ->where('mediable_type', $alias)
            ->where('mediable_id', $id)
            ->where('media_type', $validated['media_type'])
            ->exists();

        if ($exists) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'media', 'message' => 'This media is already attached with this type']],
            ], 422);
        }

        $row = Mediable::create([
            'media_id' => $validated['media_id'],
            'mediable_type' => $alias,
            'mediable_id' => $id,
            'media_type' => $validated['media_type'],
        ]);

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'media.attach',
            'entity_type' => 'media',
            'entity_id' => $validated['media_id'],
            'metadata' => ['mediable_type' => $alias, 'mediable_id' => $id, 'media_type' => $validated['media_type']],
        ]);

        return response()->json(['data' => [
            'id' => $row->id,
            'media_type' => $row->media_type,
            'media' => new MediaResource($row->media),
        ]], 201);
    }

    private function detach(Request $request, string $alias, int $id, int $mediaId): JsonResponse
    {
        $query = Mediable::where('media_id', $mediaId)
            ->where('mediable_type', $alias)
            ->where('mediable_id', $id);

        if ($request->input('media_type')) {
            $query->where('media_type', $request->input('media_type'));
        }

        $count = $query->count();

        if ($count === 0) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'media', 'message' => 'Media is not attached here']],
            ], 404);
        }

        if ($count > 1) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'media', 'message' => 'Media attached with multiple types; specify ?media_type=']],
            ], 422);
        }

        $query->delete();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'media.detach',
            'entity_type' => 'media',
            'entity_id' => $mediaId,
            'metadata' => ['mediable_type' => $alias, 'mediable_id' => $id],
        ]);

        return response()->json(['data' => null]);
    }

    private function attachmentsFor(string $alias, int $id): array
    {
        return Mediable::with('media.uploader')
            ->where('mediable_type', $alias)
            ->where('mediable_id', $id)
            ->get()
            ->map(fn (Mediable $row) => [
                'id' => $row->id,
                'media_type' => $row->media_type,
                'media' => new MediaResource($row->media),
            ])
            ->toArray();
    }
}
