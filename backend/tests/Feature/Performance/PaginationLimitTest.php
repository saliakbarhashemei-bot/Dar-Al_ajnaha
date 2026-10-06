<?php

use App\Models\Book;
use App\Models\Role;
use App\Models\User;

function paginationAdmin(): User
{
    seedRolesAndPermissions();

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    return $admin;
}

dataset('collection endpoints', [
    'books' => ['/api/v1/books'],
    'contributors' => ['/api/v1/contributors'],
    'users' => ['/api/v1/users'],
    'roles' => ['/api/v1/roles'],
    'permissions' => ['/api/v1/permissions'],
    'media' => ['/api/v1/media'],
    'announcements' => ['/api/v1/announcements'],
    'book-categories' => ['/api/v1/book-categories'],
    'tags' => ['/api/v1/tags'],
]);

test('per_page is capped at 100', function (string $endpoint) {
    $admin = paginationAdmin();

    $response = $this->actingAs($admin)->getJson("{$endpoint}?per_page=100000")->assertOk();

    expect($response->json('meta.per_page'))->toBe(100);
})->with('collection endpoints');

test('per_page below the default is respected but never below one', function (string $endpoint) {
    $admin = paginationAdmin();

    $response = $this->actingAs($admin)->getJson("{$endpoint}?per_page=5")->assertOk();
    expect($response->json('meta.per_page'))->toBe(5);

    $response = $this->actingAs($admin)->getJson("{$endpoint}?per_page=0")->assertOk();
    expect($response->json('meta.per_page'))->toBe(1);
})->with('collection endpoints');

test('a non numeric per_page falls back to the default', function (string $endpoint) {
    $admin = paginationAdmin();

    $response = $this->actingAs($admin)->getJson("{$endpoint}?per_page=abc")->assertOk();

    expect($response->json('meta.per_page'))->toBe(15);
})->with('collection endpoints');

test('per_page defaults to 15 when omitted', function () {
    $admin = paginationAdmin();

    expect($this->actingAs($admin)->getJson('/api/v1/books')->assertOk()->json('meta.per_page'))->toBe(15);
});

test('a capped per_page still returns real data', function () {
    $admin = paginationAdmin();

    Book::create(['title' => 'A', 'slug' => 'a', 'status' => 'Draft']);
    Book::create(['title' => 'B', 'slug' => 'b', 'status' => 'Draft']);

    $data = $this->actingAs($admin)->getJson('/api/v1/books?per_page=99999')->assertOk()->json('data');

    expect($data)->toHaveCount(2);
});
