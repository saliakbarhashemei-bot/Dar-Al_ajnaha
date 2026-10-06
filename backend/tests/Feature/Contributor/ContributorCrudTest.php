<?php

use App\Models\Contributor;
use App\Models\Role;
use App\Models\User;

test('any auth user can list contributors', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/contributors')
        ->assertOk();
});

test('store without contributors.create returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->postJson('/api/v1/contributors', [
            'name' => 'New Contributor',
        ])
        ->assertForbidden();
});

test('store with contributors.create returns 201', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->postJson('/api/v1/contributors', [
            'name' => 'New Contributor',
            'biography' => 'A test biography',
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'New Contributor');
});

test('show returns 200', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $contributor = Contributor::create(['name' => 'Test Author', 'slug' => 'test-author']);

    $this->actingAs($user)
        ->getJson("/api/v1/contributors/{$contributor->id}")
        ->assertOk()
        ->assertJsonPath('data.name', 'Test Author');
});

test('update without contributors.edit returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);
    $contributor = Contributor::create(['name' => 'Test', 'slug' => 'test']);

    $this->actingAs($user)
        ->putJson("/api/v1/contributors/{$contributor->id}", [
            'name' => 'Updated Name',
        ])
        ->assertForbidden();
});

test('update with contributors.edit returns 200', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);
    $contributor = Contributor::create(['name' => 'Test', 'slug' => 'test']);

    $this->actingAs($user)
        ->putJson("/api/v1/contributors/{$contributor->id}", [
            'name' => 'Updated Name',
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Updated Name');
});

test('archive without contributors.archive returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);
    $contributor = Contributor::create(['name' => 'Test', 'slug' => 'test']);

    $this->actingAs($user)
        ->postJson("/api/v1/contributors/{$contributor->id}/archive")
        ->assertForbidden();
});

test('archive with contributors.archive returns 200', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);
    $contributor = Contributor::create(['name' => 'Test', 'slug' => 'test']);

    $this->actingAs($user)
        ->postJson("/api/v1/contributors/{$contributor->id}/archive")
        ->assertOk()
        ->assertJsonPath('data.is_archived', true);
});

test('archived contributor cannot be archived again', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);
    $contributor = Contributor::create(['name' => 'Test', 'slug' => 'test', 'is_archived' => true]);

    $this->actingAs($user)
        ->postJson("/api/v1/contributors/{$contributor->id}/archive")
        ->assertStatus(422);
});

test('delete non-archived contributor returns 422', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);
    $contributor = Contributor::create(['name' => 'Test', 'slug' => 'test']);

    $this->actingAs($user)
        ->deleteJson("/api/v1/contributors/{$contributor->id}")
        ->assertStatus(422);
});

test('delete archived contributor without contributors.delete returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);
    $contributor = Contributor::create(['name' => 'Test', 'slug' => 'test', 'is_archived' => true]);

    $this->actingAs($user)
        ->deleteJson("/api/v1/contributors/{$contributor->id}")
        ->assertForbidden();
});

test('delete archived contributor with contributors.delete returns 200', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);
    $contributor = Contributor::create(['name' => 'Test', 'slug' => 'test', 'is_archived' => true]);

    $this->actingAs($user)
        ->deleteJson("/api/v1/contributors/{$contributor->id}")
        ->assertOk();

    $this->assertSoftDeleted('contributors', ['id' => $contributor->id]);
});

test('soft deleted contributor missing from index', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $contributor = Contributor::create(['name' => 'Test', 'slug' => 'test']);
    $contributor->delete();

    $response = $this->actingAs($user)
        ->getJson('/api/v1/contributors');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->not->toContain($contributor->id);
});

test('search by name works', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    Contributor::create(['name' => 'Unique Author Name', 'slug' => 'unique-author']);
    Contributor::create(['name' => 'Another Person', 'slug' => 'another-person']);

    $response = $this->actingAs($user)
        ->getJson('/api/v1/contributors?q=Unique');

    $response->assertOk();
    $names = collect($response->json('data'))->pluck('name');
    expect($names)->toContain('Unique Author Name');
    expect($names)->not->toContain('Another Person');
});
