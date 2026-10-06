<?php

namespace App\Http\Controllers\Book;

use App\Http\Controllers\Concerns\PaginatesRequests;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tag\StoreTagRequest;
use App\Http\Resources\TagResource;
use App\Models\ActivityLog;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TagController extends Controller
{
    use PaginatesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Tag::class);

        return TagResource::collection(Tag::query()->paginate($this->perPage($request)));
    }

    public function store(StoreTagRequest $request): JsonResponse
    {
        $this->authorize('create', Tag::class);

        $tag = Tag::create($request->validated());

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.tag.create',
            'entity_type' => 'tag',
            'entity_id' => $tag->id,
        ]);

        return response()->json(['data' => new TagResource($tag)], 201);
    }

    public function destroy(Request $request, Tag $tag): JsonResponse
    {
        $this->authorize('delete', $tag);

        if ($tag->books()->exists()) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'tag', 'message' => 'Cannot delete tag referenced by books']],
            ], 422);
        }

        $tag->delete();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.tag.delete',
            'entity_type' => 'tag',
            'entity_id' => $tag->id,
        ]);

        return response()->json(['data' => null]);
    }
}
