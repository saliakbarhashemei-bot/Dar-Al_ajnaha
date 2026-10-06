<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdatePasswordRequest;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'current_password', 'message' => 'Current password is incorrect']],
            ], 422);
        }

        $user->update(['password' => $request->password]);

        // Changing the password invalidates every existing credential.
        $user->revokeAllTokens();

        ActivityLog::create([
            'actor_id' => $user->id,
            'action' => 'user.password.update',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);

        return response()->json(['data' => null]);
    }
}
