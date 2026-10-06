<?php

namespace App\Http\Controllers\Role;

use App\Http\Controllers\Concerns\PaginatesRequests;
use App\Http\Controllers\Controller;
use App\Http\Resources\PermissionResource;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PermissionController extends Controller
{
    use PaginatesRequests;

    public function index(Request $request): AnonymousResourceCollection
    {
        $permissions = Permission::query()
            ->searchColumns(['name'], $request->input('search'))
            ->paginate($this->perPage($request));

        return PermissionResource::collection($permissions);
    }

    public function show(Permission $permission): JsonResponse
    {
        return response()->json([
            'data' => new PermissionResource($permission),
        ]);
    }
}
