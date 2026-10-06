<?php

namespace App\Http\Controllers\Book;

use App\Http\Controllers\Concerns\PaginatesRequests;
use App\Http\Controllers\Controller;
use App\Http\Requests\BookCategory\StoreBookCategoryRequest;
use App\Http\Requests\BookCategory\UpdateBookCategoryRequest;
use App\Http\Resources\BookCategoryResource;
use App\Models\ActivityLog;
use App\Models\BookCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BookCategoryController extends Controller
{
    use PaginatesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', BookCategory::class);

        // Paginated rather than cached: the collection-endpoint contract is
        // default 15 / max 100, and no hot path needs the full list.
        return BookCategoryResource::collection(BookCategory::query()->paginate($this->perPage($request)));
    }

    public function store(StoreBookCategoryRequest $request): JsonResponse
    {
        $this->authorize('create', BookCategory::class);

        $category = BookCategory::create($request->validated());

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.category.create',
            'entity_type' => 'book_category',
            'entity_id' => $category->id,
        ]);

        return response()->json(['data' => new BookCategoryResource($category)], 201);
    }

    public function update(UpdateBookCategoryRequest $request, BookCategory $bookCategory): JsonResponse
    {
        $this->authorize('update', $bookCategory);

        $bookCategory->update($request->validated());

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.category.update',
            'entity_type' => 'book_category',
            'entity_id' => $bookCategory->id,
        ]);

        return response()->json(['data' => new BookCategoryResource($bookCategory)]);
    }

    public function destroy(Request $request, BookCategory $bookCategory): JsonResponse
    {
        $this->authorize('delete', $bookCategory);

        if ($bookCategory->books()->exists()) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'category', 'message' => 'Cannot delete category referenced by books']],
            ], 422);
        }

        $bookCategory->delete();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.category.delete',
            'entity_type' => 'book_category',
            'entity_id' => $bookCategory->id,
        ]);

        return response()->json(['data' => null]);
    }
}
