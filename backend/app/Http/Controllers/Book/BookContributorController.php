<?php

namespace App\Http\Controllers\Book;

use App\Http\Controllers\Controller;
use App\Http\Requests\Book\AttachBookContributorRequest;
use App\Http\Requests\Book\DetachBookContributorRequest;
use App\Http\Requests\Book\UpdateBookContributorRequest;
use App\Models\ActivityLog;
use App\Models\Book;
use App\Models\Contributor;
use App\Models\ContributorRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookContributorController extends Controller
{
    public function index(Request $request, Book $book): JsonResponse
    {
        $this->authorize('view', $book);

        $rows = DB::table('book_contributor')
            ->join('contributors', 'contributors.id', '=', 'book_contributor.contributor_id')
            ->join('contributor_roles', 'contributor_roles.id', '=', 'book_contributor.contributor_role_id')
            ->where('book_contributor.book_id', $book->id)
            ->select(
                'book_contributor.id',
                'contributors.id as contributor_id',
                'contributors.name as contributor_name',
                'contributors.slug as contributor_slug',
                'contributor_roles.id as role_id',
                'contributor_roles.name as role_name',
                'contributor_roles.label as role_label'
            )
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function attach(AttachBookContributorRequest $request, Book $book): JsonResponse
    {
        $this->authorize('attachContributor', $book);

        $roleId = $this->resolveRoleId($request->validated());

        $exists = DB::table('book_contributor')
            ->where('book_id', $book->id)
            ->where('contributor_id', $request->input('contributor_id'))
            ->where('contributor_role_id', $roleId)
            ->exists();

        if ($exists) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'contributor', 'message' => 'This contributor already has this role on the book']],
            ], 422);
        }

        $book->contributors()->attach($request->input('contributor_id'), ['contributor_role_id' => $roleId]);

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.contributor.attach',
            'entity_type' => 'book',
            'entity_id' => $book->id,
            'metadata' => ['contributor_id' => $request->input('contributor_id'), 'contributor_role_id' => $roleId],
        ]);

        return response()->json(['data' => $this->index($request, $book)->getData()->data], 201);
    }

    public function update(UpdateBookContributorRequest $request, Book $book, Contributor $contributor): JsonResponse
    {
        $this->authorize('updateContributor', $book);

        $newRoleId = $this->resolveRoleId($request->validated());

        $rows = DB::table('book_contributor')
            ->where('book_id', $book->id)
            ->where('contributor_id', $contributor->id)
            ->get();

        if ($rows->isEmpty()) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'contributor', 'message' => 'Contributor is not attached to this book']],
            ], 404);
        }

        if ($rows->count() > 1) {
            $oldRoleId = $request->input('current_role_id') ?? $request->input('current_contributor_role_id');

            if (! $oldRoleId) {
                return response()->json([
                    'data' => null,
                    'errors' => [['field' => 'contributor', 'message' => 'Contributor has multiple roles; specify current_role_id']],
                ], 422);
            }

            $rows = $rows->where('contributor_role_id', (int) $oldRoleId);

            if ($rows->count() !== 1) {
                return response()->json([
                    'data' => null,
                    'errors' => [['field' => 'contributor', 'message' => 'No matching contributor role found']],
                ], 404);
            }
        }

        DB::table('book_contributor')->where('id', $rows->first()->id)->update([
            'contributor_role_id' => $newRoleId,
            'updated_at' => now(),
        ]);

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.contributor.update',
            'entity_type' => 'book',
            'entity_id' => $book->id,
            'metadata' => ['contributor_id' => $contributor->id, 'contributor_role_id' => $newRoleId],
        ]);

        return response()->json(['data' => $this->index($request, $book)->getData()->data]);
    }

    public function detach(DetachBookContributorRequest $request, Book $book, Contributor $contributor): JsonResponse
    {
        $this->authorize('detachContributor', $book);

        $validated = $request->validated();

        $roleId = $validated['contributor_role_id'] ?? $this->roleIdFromName($validated['role'] ?? null);

        $query = DB::table('book_contributor')
            ->where('book_id', $book->id)
            ->where('contributor_id', $contributor->id);

        if ($roleId) {
            $query->where('contributor_role_id', $roleId);
        }

        $count = $query->count();

        if ($count === 0) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'contributor', 'message' => 'Contributor is not attached to this book']],
            ], 404);
        }

        if ($count > 1 && ! $roleId) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'contributor', 'message' => 'Contributor has multiple roles; specify contributor_role_id']],
            ], 422);
        }

        $query->delete();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'book.contributor.detach',
            'entity_type' => 'book',
            'entity_id' => $book->id,
            'metadata' => ['contributor_id' => $contributor->id, 'contributor_role_id' => $roleId],
        ]);

        return response()->json(['data' => null]);
    }

    private function resolveRoleId(array $validated): int
    {
        if (! empty($validated['contributor_role_id'])) {
            return (int) $validated['contributor_role_id'];
        }

        $roleId = $this->roleIdFromName($validated['role'] ?? null);

        if (! $roleId) {
            abort(422, 'Unknown contributor role');
        }

        return $roleId;
    }

    private function roleIdFromName(?string $name): ?int
    {
        if (! $name) {
            return null;
        }

        return ContributorRole::where('name', $name)->value('id');
    }
}
