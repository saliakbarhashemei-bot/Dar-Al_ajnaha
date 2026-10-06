<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

test('assign permission to role and user gains permission', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);

    $permission = Permission::where('name', 'books.create')->first();
    $role->permissions()->attach($permission);

    $user = $user->fresh();
    expect($user->hasPermission('books.create'))->toBeTrue();
});

test('revoke permission and user loses it', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $permission = Permission::where('name', 'books.create')->first();
    $role->permissions()->detach($permission);

    $user = $user->fresh();
    expect($user->hasPermission('books.create'))->toBeFalse();
});

test('cannot delete role with users assigned', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->deleteJson("/api/v1/roles/{$role->id}")
        ->assertStatus(422);
});
