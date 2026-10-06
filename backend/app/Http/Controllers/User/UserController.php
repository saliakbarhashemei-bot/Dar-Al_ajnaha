<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Concerns\PaginatesRequests;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Requests\User\UpdateUserRolesRequest;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    use PaginatesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $users = User::with('roles.permissions')
            ->searchColumns(['name'], $request->input('search'))
            ->paginate($this->perPage($request));

        return UserResource::collection($users);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return response()->json([
            'data' => new UserResource($user->load('roles.permissions')),
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $user = User::create($request->validated());
        $user->roles()->sync($request->role_ids);

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'user.create',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);

        return response()->json([
            'data' => new UserResource($user->load('roles.permissions')),
        ], 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $user->update($request->validated());

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'user.update',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);

        return response()->json([
            'data' => new UserResource($user->load('roles.permissions')),
        ]);
    }

    public function disable(Request $request, User $user): JsonResponse
    {
        $this->authorize('disable', $user);

        $user->update(['is_active' => false]);

        // A disabled account must lose access immediately, not when its
        // existing tokens happen to expire.
        $user->revokeAllTokens();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'user.disable',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $user->delete();
        $user->revokeAllTokens();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'user.delete',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);

        return response()->json(['data' => null]);
    }

    public function updateRoles(UpdateUserRolesRequest $request, User $user): JsonResponse
    {
        $this->authorize('updateRoles', $user);

        $user->roles()->sync($request->role_ids);

        // Role changes alter the permission set, so cached permissions and
        // tokens issued under the old roles are no longer valid.
        $user->revokeAllTokens();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'user.roles.update',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);

        return response()->json([
            'data' => new UserResource($user->load('roles.permissions')),
        ]);
    }
}
