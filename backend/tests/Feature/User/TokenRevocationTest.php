<?php

use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

function tokenRevocationAdmin(): User
{
    seedRolesAndPermissions();

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    return $admin;
}

test('disabling a user revokes their existing tokens', function () {
    $admin = tokenRevocationAdmin();
    $target = User::factory()->create(['is_active' => true]);
    $token = $target->createToken('test')->plainTextToken;

    $this->actingAs($admin)
        ->postJson("/api/v1/users/{$target->id}/disable")->assertOk();

    $this->assertDatabaseMissing('personal_access_tokens', [
        'tokenable_id' => $target->id,
        'tokenable_type' => User::class,
    ]);

    // The previously issued token no longer authenticates.
    auth()->forgetGuards();
    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/me')
        ->assertUnauthorized();
});

test('disabling a user invalidates their cached permission set', function () {
    $admin = tokenRevocationAdmin();
    $target = User::factory()->create(['is_active' => true]);
    $target->roles()->attach(Role::where('name', 'admin')->first());

    // Warm the cache, then confirm the write path drops it.
    expect($target->hasPermission('books.create'))->toBeTrue();
    expect(Cache::has("user.{$target->id}.permissions"))->toBeTrue();

    $this->actingAs($admin)
        ->postJson("/api/v1/users/{$target->id}/disable")->assertOk();

    expect(Cache::has("user.{$target->id}.permissions"))->toBeFalse();
});

test('changing a password revokes existing tokens and is audited', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
    ]);
    $token = $user->createToken('test')->plainTextToken;

    $this->actingAs($user)
        ->putJson('/api/v1/me/password', [
            'current_password' => 'password123',
            'password' => 'newpassword456',
            'password_confirmation' => 'newpassword456',
        ])->assertOk();

    $this->assertDatabaseMissing('personal_access_tokens', [
        'tokenable_id' => $user->id,
        'tokenable_type' => User::class,
    ]);

    $this->assertDatabaseHas('activity_log', [
        'actor_id' => $user->id,
        'action' => 'user.password.update',
        'entity_id' => $user->id,
    ]);

    // The old credential is gone; the new password is the only way back in.
    auth()->forgetGuards();
    $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/me')
        ->assertUnauthorized();

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'newpassword456',
    ])->assertOk();
});

test('changing a user role revokes their existing tokens', function () {
    $admin = tokenRevocationAdmin();
    $target = User::factory()->create();
    $target->createToken('test');

    $this->actingAs($admin)
        ->putJson("/api/v1/users/{$target->id}/roles", [
            'role_ids' => [Role::where('name', 'admin')->first()->id],
        ])->assertOk();

    $this->assertDatabaseMissing('personal_access_tokens', [
        'tokenable_id' => $target->id,
        'tokenable_type' => User::class,
    ]);
});

test('deleting a user revokes their existing tokens', function () {
    $admin = tokenRevocationAdmin();
    $target = User::factory()->create();
    $target->createToken('test');

    $this->actingAs($admin)
        ->deleteJson("/api/v1/users/{$target->id}")->assertOk();

    $this->assertDatabaseMissing('personal_access_tokens', [
        'tokenable_id' => $target->id,
        'tokenable_type' => User::class,
    ]);
});

test('activity log records password changes without the passwords', function () {
    $user = User::factory()->create(['password' => Hash::make('password123')]);

    $this->actingAs($user)
        ->putJson('/api/v1/me/password', [
            'current_password' => 'password123',
            'password' => 'newpassword456',
            'password_confirmation' => 'newpassword456',
        ])->assertOk();

    $entry = ActivityLog::where('action', 'user.password.update')->first();

    expect($entry)->not->toBeNull()
        ->and(json_encode($entry->metadata))->not->toContain('newpassword456')
        ->and(json_encode($entry->metadata))->not->toContain('password123');
});
