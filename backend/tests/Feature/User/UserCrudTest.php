<?php

use App\Models\Role;
use App\Models\User;

test('any auth user can list users', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    User::factory()->count(3)->create();

    $this->actingAs($user)
        ->getJson('/api/v1/users')
        ->assertOk();
});

test('store without users.create permission returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->postJson('/api/v1/users', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role_ids' => [$role->id],
        ])
        ->assertForbidden();
});

test('store with users.create permission returns 201', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->postJson('/api/v1/users', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role_ids' => [$role->id],
        ])
        ->assertCreated();
});

test('self update without users.edit returns 200', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->putJson("/api/v1/users/{$user->id}", [
            'name' => 'Updated Name',
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Updated Name');
});

test('disable self returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->postJson("/api/v1/users/{$user->id}/disable")
        ->assertForbidden();
});

test('disable other with users.disable returns 200', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $target = User::factory()->create();

    $this->actingAs($user)
        ->postJson("/api/v1/users/{$target->id}/disable")
        ->assertOk()
        ->assertJsonPath('data.is_active', false);
});

test('delete self returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->deleteJson("/api/v1/users/{$user->id}")
        ->assertForbidden();
});

test('delete other with users.delete returns 204', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $target = User::factory()->create();

    $this->actingAs($user)
        ->deleteJson("/api/v1/users/{$target->id}")
        ->assertOk();

    $this->assertSoftDeleted('users', ['id' => $target->id]);
});

test('soft deleted user missing from list', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $target = User::factory()->create();
    $target->delete();

    $response = $this->actingAs($user)
        ->getJson('/api/v1/users');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->not->toContain($target->id);
});
