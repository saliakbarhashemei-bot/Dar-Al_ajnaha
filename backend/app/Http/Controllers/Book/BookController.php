<?php

namespace App\Http\Controllers\Book;

use App\Http\Controllers\Concerns\PaginatesRequests;
use App\Http\Controllers\Controller;
use App\Http\Requests\Book\StoreBookRequest;
use App\Http\Requests\Book\UpdateBookRequest;
use App\Http\Resources\BookResource;
use App\Models\ActivityLog;
use App\Models\Book;
use App\Models\ContributorRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BookController extends Controller
{
    use PaginatesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Book::class);

        $query = Book::query()
            ->with(['category', 'tags', 'contributors'])
            ->withCount('contributors')
            ->searchColumns(['title', 'slug', 'isbn', 'description'], $request->input('q'))
            ->when($request->input('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->input('language'), fn ($q) => $q->where('language', $request->input('language')))
            ->when($request->input('book_category_id'), fn ($q) => $q->where('book_category_id', $request->input('book_category_id')))
            ->when($request->input('tag_id'), fn ($q) => $q->whereHas('tags', fn ($t) => $t->where('tags.id', $request->input('tag_id'))))
            ->when($request->input('contributor_id'), fn ($q) => $q->whereHas('contributors', fn ($c) => $c->where('contributors.id', $request->input('contributor_id'))))
            ->when($request->input('contributor_role_id'), fn ($q) => $q->whereHas('contributors', fn ($c) => $c->where('book_contributor.contributor_role_id', $request->input('contributor_role_id'))));

        if ($request->has('is_archived')) {
            $query->where('is_archived', $request->boolean('is_archived'));
        } else {
            $query->where('is_archived', false);
        }

        $books = $query->paginate($this->perPage($request));

        return BookResource::collection($books);
    }

    public function show(Request $request, Book $book): JsonResponse
    {
        $this->authorize('view', $book);

        $book->load(['category', 'tags', 'contributors', 'media.uploader']);

        return response()->json([
            'data' => new BookResource($book),
        ]);
    }

    public function store(StoreBookRequest $request): JsonResponse
    {
        $this->authorize('create', Book::class);

        $validated = $request->validated();

        $book = Book::create(collect($validated)->except(['tag_ids', 'contributors'])->toArray());

        if (! empty($validated['tag_ids'])) {
            $book->tags()->sync($validated['tag_ids']);
        }

        if (! empty($validated['contributors'])) {
            foreach ($validated['contributors'] as $entry) {
                $roleId = $this->resolveRoleId($entry);
                $book->contributors()->attach($entry['contributor_id'], ['contributor_role_id' => $roleId]);
            }
        }

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.create',
            'entity_type' => 'book',
            'entity_id' => $book->id,
        ]);

        return response()->json([
            'data' => new BookResource($book->load(['category', 'tags', 'contributors'])),
        ], 201);
    }

    public function update(UpdateBookRequest $request, Book $book): JsonResponse
    {
        $this->authorize('update', $book);

        $validated = $request->validated();

        $book->update(collect($validated)->except(['tag_ids'])->toArray());

        if (array_key_exists('tag_ids', $validated)) {
            $book->tags()->sync($validated['tag_ids'] ?? []);
        }

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.update',
            'entity_type' => 'book',
            'entity_id' => $book->id,
        ]);

        return response()->json([
            'data' => new BookResource($book->load(['category', 'tags', 'contributors'])),
        ]);
    }

    public function archive(Request $request, Book $book): JsonResponse
    {
        $this->authorize('archive', $book);

        if ($book->is_archived) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'book', 'message' => 'Book is already archived']],
            ], 422);
        }

        $book->update(['is_archived' => true]);

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.archive',
            'entity_type' => 'book',
            'entity_id' => $book->id,
        ]);

        return response()->json([
            'data' => new BookResource($book),
        ]);
    }

    public function destroy(Request $request, Book $book): JsonResponse
    {
        $this->authorize('delete', $book);

        if (! $book->is_archived) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'book', 'message' => 'Archive book before deleting']],
            ], 422);
        }

        if ($book->announcements()->exists()) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'book', 'message' => 'Cannot delete book with linked announcements']],
            ], 422);
        }

        $book->delete();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.delete',
            'entity_type' => 'book',
            'entity_id' => $book->id,
        ]);

        return response()->json(['data' => null]);
    }

    private function resolveRoleId(array $entry): int
    {
        if (! empty($entry['contributor_role_id'])) {
            return (int) $entry['contributor_role_id'];
        }

        $role = ContributorRole::where('name', $entry['role'] ?? '')->first();

        if (! $role) {
            abort(422, 'Unknown contributor role');
        }

        return $role->id;
    }
}
