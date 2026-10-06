<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;

test('permission matrix matches Phase 1 spec for all 5 default roles', function () {
    seedRolesAndPermissions();

    $expected = [
        'admin' => '*',
        'editor' => 'except:users.',
        'media_manager' => ['media.', 'media.link'],
        'contributor_manager' => ['contributors.'],
        'announcer' => ['announcements.'],
    ];

    $allPermissions = Permission::all();

    foreach ($expected as $roleName => $rule) {
        $role = Role::where('name', $roleName)->first();
        expect($role)->not->toBeNull();

        $actual = $role->permissions()->pluck('name')->sort()->values();

        if ($rule === '*') {
            $expectedList = $allPermissions->pluck('name')->sort()->values();
        } elseif (is_string($rule) && str_starts_with($rule, 'except:')) {
            $prefix = substr($rule, strlen('except:'));
            $expectedList = $allPermissions->filter(fn ($p) => ! str_starts_with($p->name, $prefix))->pluck('name')->sort()->values();
        } else {
            $expectedList = $allPermissions->filter(
                fn ($p) => collect($rule)->contains(fn ($prefix) => $p->name === $prefix || str_starts_with($p->name, $prefix))
            )->pluck('name')->sort()->values();
        }

        expect($actual->toArray())->toBe($expectedList->toArray(), "Role {$roleName} permission mismatch");
    }
});

test('role without permission gets 403 on protected endpoints', function () {
    seedRolesAndPermissions();

    $user = User::factory()->create();
    $role = Role::where('name', 'contributor_manager')->first();
    $user->roles()->attach($role);

    $auth = ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken];

    // contributor_manager lacks users.*, books.*, media.*, announcements.*
    $this->withHeaders($auth)->postJson('/api/v1/users', [
        'name' => 'X', 'email' => 'x@example.com', 'password' => 'password123',
        'password_confirmation' => 'password123', 'role_ids' => [$role->id],
    ])->assertForbidden();

    $this->withHeaders($auth)->postJson('/api/v1/books', ['title' => 'X', 'status' => 'Draft'])->assertForbidden();

    Storage::fake('local');
    $this->withHeaders($auth)->post('/api/v1/media', [
        'file' => UploadedFile::fake()->image('a.jpg', 600, 800),
        'media_type' => 'Book Cover',
    ])->assertForbidden();

    $this->withHeaders($auth)->postJson('/api/v1/announcements', [
        'title' => 'X', 'type' => 'News', 'status' => 'Draft',
    ])->assertForbidden();
});

test('admin can hit every protected endpoint', function () {
    seedRolesAndPermissions();
    Storage::fake('local');

    $user = User::factory()->create();
    $adminRole = Role::where('name', 'admin')->first();
    $user->roles()->attach($adminRole);
    $auth = ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken];

    $this->withHeaders($auth)->getJson('/api/v1/users')->assertOk();
    $this->withHeaders($auth)->getJson('/api/v1/roles')->assertOk();
    $this->withHeaders($auth)->getJson('/api/v1/permissions')->assertOk();
    $this->withHeaders($auth)->getJson('/api/v1/contributors')->assertOk();
    $this->withHeaders($auth)->getJson('/api/v1/books')->assertOk();
    $this->withHeaders($auth)->getJson('/api/v1/media')->assertOk();
    $this->withHeaders($auth)->getJson('/api/v1/announcements')->assertOk();
    $this->withHeaders($auth)->getJson('/api/v1/media-types')->assertOk();
    $this->withHeaders($auth)->getJson('/api/v1/contributor-roles')->assertOk();
});
