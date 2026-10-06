<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('valid credentials return 200 and user', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => Hash::make('password123'),
        'is_active' => true,
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.user.email', 'test@example.com');
});

test('invalid email returns 422', function () {
    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'nonexistent@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(422);
});

test('wrong password returns 422 with generic message', function () {
    User::factory()->create([
        'email' => 'test@example.com',
        'password' => Hash::make('password123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'test@example.com',
        'password' => 'wrongpassword',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('errors.0.message', 'Invalid credentials');
});

test('inactive user returns 422 with account disabled', function () {
    User::factory()->create([
        'email' => 'inactive@example.com',
        'password' => Hash::make('password123'),
        'is_active' => false,
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'inactive@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('errors.0.message', 'Account disabled');
});

test('5 failed attempts in 1 minute returns 429', function () {
    User::factory()->create([
        'email' => 'test@example.com',
        'password' => Hash::make('password123'),
    ]);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);
    }

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'test@example.com',
        'password' => 'wrongpassword',
    ]);

    $response->assertStatus(429);
});
