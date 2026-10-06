<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('login writes user.login activity log row', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => Hash::make('password123'),
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $this->assertDatabaseHas('activity_log', [
        'action' => 'user.login',
        'entity_type' => 'user',
        'entity_id' => $user->id,
    ]);
});

test('create user writes user.create activity log row with actor_id', function () {
    seedRolesAndPermissions();
    $admin = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $admin->roles()->attach($role);

    $this->actingAs($admin)
        ->postJson('/api/v1/users', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role_ids' => [$role->id],
        ]);

    $this->assertDatabaseHas('activity_log', [
        'action' => 'user.create',
        'actor_id' => $admin->id,
    ]);
});
