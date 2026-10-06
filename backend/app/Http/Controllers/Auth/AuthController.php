<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'email', 'message' => 'Invalid credentials']],
            ], 422);
        }

        if (! $user->is_active) {
            return response()->json([
                'data' => null,
                'errors' => [['field' => 'email', 'message' => 'Account disabled']],
            ], 422);
        }

        $user->update(['last_login_at' => now()]);

        ActivityLog::create([
            'actor_id' => $user->id,
            'action' => 'user.login',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);

        $expiration = config('sanctum.expiration');

        // SPA authentication: the frontend holds the session cookie, so the
        // `web` guard must be logged in for `auth:sanctum` to resolve the user
        // on subsequent requests. The API token is still issued for
        // non-browser clients.
        Auth::guard('web')->login($user);

        $token = $user->createToken(
            'auth-token',
            expiresAt: $expiration ? now()->addMinutes((int) $expiration) : null,
        )->plainTextToken;

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        ActivityLog::create([
            'actor_id' => $user->id,
            'action' => 'user.logout',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);

        $accessToken = $user->currentAccessToken();

        // Session (cookie) clients get a TransientToken, which has no
        // database row to delete; API token clients get a real token.
        if ($accessToken instanceof PersonalAccessToken) {
            $accessToken->delete();
        }

        // Bearer-token clients have no session store on the request.
        if ($request->hasSession()) {
            Auth::guard('web')->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['data' => null]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles.permissions');

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }
}
