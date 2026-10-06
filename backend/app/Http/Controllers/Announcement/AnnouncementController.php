<?php

namespace App\Http\Controllers\Announcement;

use App\Http\Controllers\Concerns\PaginatesRequests;
use App\Http\Controllers\Controller;
use App\Http\Requests\Announcement\StoreAnnouncementRequest;
use App\Http\Requests\Announcement\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\ActivityLog;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AnnouncementController extends Controller
{
    use PaginatesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Announcement::class);

        $query = Announcement::query()
            ->with(['book', 'media.uploader'])
            ->searchColumns(['title', 'short_description', 'content'], $request->input('q'))
            ->when($request->input('type'), fn ($q) => $q->where('type', $request->input('type')))
            ->when($request->input('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->input('book_id'), fn ($q) => $q->where('book_id', $request->input('book_id')));

        if ($request->has('is_archived')) {
            $query->where('is_archived', $request->boolean('is_archived'));
        } else {
            $query->where('is_archived', false);
        }

        return AnnouncementResource::collection($query->paginate($this->perPage($request)));
    }

    public function show(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('view', $announcement);

        return response()->json([
            'data' => new AnnouncementResource($announcement->load(['book', 'media.uploader'])),
        ]);
    }

    public function store(StoreAnnouncementRequest $request): JsonResponse
    {
        $this->authorize('create', Announcement::class);

        $announcement = Announcement::create($request->validated());

        if ($announcement->status === 'Published' && ! $announcement->published_at) {
            $announcement->update(['published_at' => now()]);
        }

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'announcement.create',
            'entity_type' => 'announcement',
            'entity_id' => $announcement->id,
        ]);

        return response()->json([
            'data' => new AnnouncementResource($announcement->load(['book', 'media.uploader'])),
        ], 201);
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('update', $announcement);

        $announcement->update($request->validated());

        if ($announcement->status === 'Published' && ! $announcement->published_at) {
            $announcement->update(['published_at' => now()]);
        }

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'announcement.update',
            'entity_type' => 'announcement',
            'entity_id' => $announcement->id,
        ]);

        return response()->json([
            'data' => new AnnouncementResource($announcement->load(['book', 'media.uploader'])),
        ]);
    }

    public function archive(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('archive', $announcement);

        if ($announcement->is_archived) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'announcement', 'message' => 'Announcement is already archived']],
            ], 422);
        }

        $announcement->update(['is_archived' => true]);

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'announcement.archive',
            'entity_type' => 'announcement',
            'entity_id' => $announcement->id,
        ]);

        return response()->json([
            'data' => new AnnouncementResource($announcement),
        ]);
    }

    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        $this->authorize('delete', $announcement);

        if (! $announcement->is_archived) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'announcement', 'message' => 'Archive announcement before deleting']],
            ], 422);
        }

        $announcement->media()->detach();
        $announcement->delete();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'announcement.delete',
            'entity_type' => 'announcement',
            'entity_id' => $announcement->id,
        ]);

        return response()->json(['data' => null]);
    }
}
