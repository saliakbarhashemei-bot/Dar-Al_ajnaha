<?php

use App\Models\User;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

test('unauthenticated request to a protected endpoint returns 401 not 500', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

test('unauthenticated request to every authed group returns 401 not 500', function () {
    $this->getJson('/api/v1/books')->assertUnauthorized();
    $this->getJson('/api/v1/users')->assertUnauthorized();
    $this->getJson('/api/v1/roles')->assertUnauthorized();
    $this->getJson('/api/v1/contributors')->assertUnauthorized();
    $this->getJson('/api/v1/media')->assertUnauthorized();
    $this->getJson('/api/v1/announcements')->assertUnauthorized();
    $this->postJson('/api/v1/auth/logout')->assertUnauthorized();
});

test('unauthenticated write attempt returns 401 not 500', function () {
    $this->postJson('/api/v1/books', ['title' => 'x', 'status' => 'Draft'])->assertUnauthorized();
    $this->postJson('/api/v1/media')->assertUnauthorized();
});

test('stateful middleware is registered on the api group', function () {
    $kernel = app(Kernel::class);

    $apiGroup = $kernel->getMiddlewareGroups()['api'] ?? [];

    expect($apiGroup)->toContain(EnsureFrontendRequestsAreStateful::class);
});

test('login issues a token with an expiry', function () {
    $user = User::factory()->create([
        'email' => 'expiry@example.com',
        'password' => Hash::make('password123'),
        'is_active' => true,
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'expiry@example.com',
        'password' => 'password123',
    ])->assertOk();

    $token = $user->tokens()->first();

    expect($token)->not->toBeNull()
        ->and($token->expires_at)->not->toBeNull();
});

test('session cookie auth can reach a protected endpoint', function () {
    User::factory()->create([
        'email' => 'cookie@example.com',
        'password' => Hash::make('password123'),
        'is_active' => true,
    ]);

    // Browsers send Referer/Origin from the SPA; Sanctum only applies the
    // stateful cookie stack for requests from a configured stateful domain.
    $spa = ['Referer' => 'http://localhost:5173', 'Origin' => 'http://localhost:5173'];

    $login = $this->withHeaders($spa)->postJson('/api/v1/auth/login', [
        'email' => 'cookie@example.com',
        'password' => 'password123',
    ])->assertOk();

    // Forward the cookies the browser would store.
    $cookies = collect($login->headers->getCookies())
        ->mapWithKeys(fn ($cookie) => [$cookie->getName() => $cookie->getValue()])
        ->all();

    expect($cookies)->not->toBeEmpty();

    // No bearer token and no Sanctum::actingAs(): proves the stateful
    // session cookie issued by login authenticates subsequent requests.
    $this->withHeaders($spa)
        ->withCookie('laravel_session', $cookies[config('session.cookie')])
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.email', 'cookie@example.com');
});

test('stateless requests without a stateful origin still return 401 not 500', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});
