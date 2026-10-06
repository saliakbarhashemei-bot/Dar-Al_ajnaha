<?php

namespace App\Http\Controllers\Role;

use App\Http\Controllers\Concerns\PaginatesRequests;
use App\Http\Controllers\Controller;
use App\Http\Requests\Role\StoreRoleRequest;
use App\Http\Requests\Role\UpdateRolePermissionsRequest;
use App\Http\Requests\Role\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\ActivityLog;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RoleController extends Controller
{
    use PaginatesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Role::class);

        $roles = Role::with('permissions')
            ->searchColumns(['name'], $request->input('search'))
            ->paginate($this->perPage($request));

        return RoleResource::collection($roles);
    }

    public function show(Request $request, Role $role): JsonResponse
    {
        $this->authorize('view', $role);

        return response()->json([
            'data' => new RoleResource($role->load('permissions')),
        ]);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $this->authorize('create', Role::class);

        $role = Role::create($request->validated());

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'role.create',
            'entity_type' => 'role',
            'entity_id' => $role->id,
        ]);

        return response()->json([
            'data' => new RoleResource($role),
        ], 201);
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $this->authorize('update', $role);

        $role->update($request->validated());

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'role.update',
            'entity_type' => 'role',
            'entity_id' => $role->id,
        ]);

        return response()->json([
            'data' => new RoleResource($role),
        ]);
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        $this->authorize('delete', $role);

        if ($role->users()->exists()) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'role', 'message' => 'Cannot delete role with assigned users']],
            ], 422);
        }

        $role->delete();

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'role.delete',
            'entity_type' => 'role',
            'entity_id' => $role->id,
        ]);

        return response()->json(['data' => null]);
    }

    public function updatePermissions(UpdateRolePermissionsRequest $request, Role $role): JsonResponse
    {
        $this->authorize('updatePermissions', $role);

        $role->permissions()->sync($request->permission_ids);

        $role->users()->each(fn ($user) => $user->flushPermissionCache());

        ActivityLog::create([
            'actor_id' => $request->user()->id,
            'action' => 'role.permissions.update',
            'entity_type' => 'role',
            'entity_id' => $role->id,
        ]);

        return response()->json([
            'data' => new RoleResource($role->load('permissions')),
        ]);
    }
}
