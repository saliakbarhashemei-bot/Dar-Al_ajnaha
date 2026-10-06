<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('logged in user can logout', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/auth/logout');

    $response->assertOk();
    $this->assertDatabaseMissing('personal_access_tokens', ['token' => hash('sha256', $token)]);
});

test('after logout me returns 401', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/auth/logout');

    auth()->forgetGuards();

    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/me')
        ->assertUnauthorized();
});

test('session client can logout and loses cookie authentication', function () {
    User::factory()->create([
        'email' => 'spa@example.com',
        'password' => Hash::make('password123'),
        'is_active' => true,
    ]);

    $spa = ['Referer' => 'http://localhost:5173', 'Origin' => 'http://localhost:5173'];

    $login = $this->withHeaders($spa)->postJson('/api/v1/auth/login', [
        'email' => 'spa@example.com',
        'password' => 'password123',
    ])->assertOk();

    $cookies = collect($login->headers->getCookies())
        ->mapWithKeys(fn ($cookie) => [$cookie->getName() => $cookie->getValue()])
        ->all();

    $this->withHeaders($spa)
        ->withCookie('laravel_session', $cookies[config('session.cookie')])
        ->postJson('/api/v1/auth/logout')
        ->assertOk();

    auth()->forgetGuards();

    $this->withHeaders($spa)
        ->withCookie('laravel_session', $cookies[config('session.cookie')])
        ->getJson('/api/v1/me')
        ->assertUnauthorized();
});
