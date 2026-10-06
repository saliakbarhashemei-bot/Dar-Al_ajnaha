<?php

namespace App\Http\Controllers\Contributor;

use App\Http\Controllers\Concerns\PaginatesRequests;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contributor\StoreContributorRequest;
use App\Http\Requests\Contributor\UpdateContributorRequest;
use App\Http\Resources\ContributorResource;
use App\Models\ActivityLog;
use App\Models\Contributor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ContributorController extends Controller
{
    use PaginatesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Contributor::class);

        $query = Contributor::query()
            ->withCount('books')
            ->searchColumns(['name', 'slug'], $request->input('q'))
            ->when($request->has('is_archived'), fn ($q) => $q->where('is_archived', $request->boolean('is_archived')), fn ($q) => $q->where('is_archived', false));

        $contributors = $query->paginate($this->perPage($request));

        return ContributorResource::collection($contributors);
    }

    public function show(Request $request, Contributor $contributor): JsonResponse
    {
        $this->authorize('view', $contributor);

        return response()->json([
            'data' => new ContributorResource($contributor->load(['media.uploader'])->loadCount('books')),
        ]);
    }

    public function store(StoreContributorRequest $request): JsonResponse
    {
        $this->authorize('create', Contributor::class);

        $contributor = Contributor::create($request->validated());

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'contributor.create',
            'entity_type' => 'contributor',
            'entity_id' => $contributor->id,
        ]);

        return response()->json([
            'data' => new ContributorResource($contributor),
        ], 201);
    }

    public function update(UpdateContributorRequest $request, Contributor $contributor): JsonResponse
    {
        $this->authorize('update', $contributor);

        $contributor->update($request->validated());

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'contributor.update',
            'entity_type' => 'contributor',
            'entity_id' => $contributor->id,
        ]);

        return response()->json([
            'data' => new ContributorResource($contributor),
        ]);
    }

    public function archive(Request $request, Contributor $contributor): JsonResponse
    {
        $this->authorize('archive', $contributor);

        if ($contributor->is_archived) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'contributor', 'message' => 'Contributor is already archived']],
            ], 422);
        }

        $contributor->update(['is_archived' => true]);

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'contributor.archive',
            'entity_type' => 'contributor',
            'entity_id' => $contributor->id,
        ]);

        return response()->json([
            'data' => new ContributorResource($contributor),
        ]);
    }

    public function destroy(Request $request, Contributor $contributor): JsonResponse
    {
        $this->authorize('delete', $contributor);

        if (! $contributor->is_archived) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'contributor', 'message' => 'Archive contributor before deleting']],
            ], 422);
        }

        if ($contributor->books()->exists()) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'contributor', 'message' => 'Cannot delete contributor with linked books']],
            ], 422);
        }

        $contributor->media()->detach();
        $contributor->delete();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'contributor.delete',
            'entity_type' => 'contributor',
            'entity_id' => $contributor->id,
        ]);

        return response()->json(['data' => null]);
    }
}
