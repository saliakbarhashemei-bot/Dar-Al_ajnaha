<?php

use App\Models\Book;
use App\Models\Contributor;
use App\Models\ContributorRole;
use App\Models\Role;
use App\Models\Tag;
use App\Models\User;

function adminUser(): User
{
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    return $user;
}

test('any auth user can list books', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/books')
        ->assertOk();
});

test('store without books.create returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->postJson('/api/v1/books', [
            'title' => 'New Book',
            'status' => 'Draft',
        ])
        ->assertForbidden();
});

test('store with books.create returns 201 with contributors and tags', function () {
    seedRolesAndPermissions();
    $user = adminUser();
    $contributor = Contributor::create(['name' => 'Test Author', 'slug' => 'test-author']);
    $role = ContributorRole::where('name', 'Author')->first();
    $tag = Tag::create(['name' => 'novel', 'label' => 'Novel']);

    $response = $this->actingAs($user)
        ->postJson('/api/v1/books', [
            'title' => 'New Book',
            'status' => 'Draft',
            'tag_ids' => [$tag->id],
            'contributors' => [
                ['contributor_id' => $contributor->id, 'contributor_role_id' => $role->id],
            ],
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.title', 'New Book');

    $this->assertDatabaseHas('book_tag', ['tag_id' => $tag->id]);
    $this->assertDatabaseHas('book_contributor', [
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $role->id,
    ]);
});

test('show returns 200 with eager relations', function () {
    seedRolesAndPermissions();
    $user = adminUser();
    $book = Book::create(['title' => 'Shown Book', 'slug' => 'shown-book', 'status' => 'Draft']);

    $this->actingAs($user)
        ->getJson("/api/v1/books/{$book->id}")
        ->assertOk()
        ->assertJsonPath('data.title', 'Shown Book');
});

test('update without books.edit returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);
    $book = Book::create(['title' => 'Old', 'slug' => 'old', 'status' => 'Draft']);

    $this->actingAs($user)
        ->putJson("/api/v1/books/{$book->id}", ['title' => 'New'])
        ->assertForbidden();
});

test('update with books.edit returns 200', function () {
    seedRolesAndPermissions();
    $user = adminUser();
    $book = Book::create(['title' => 'Old', 'slug' => 'old', 'status' => 'Draft']);

    $this->actingAs($user)
        ->putJson("/api/v1/books/{$book->id}", ['title' => 'New Title'])
        ->assertOk()
        ->assertJsonPath('data.title', 'New Title');
});

test('archive without books.archive returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);
    $book = Book::create(['title' => 'B', 'slug' => 'b', 'status' => 'Draft']);

    $this->actingAs($user)
        ->postJson("/api/v1/books/{$book->id}/archive")
        ->assertForbidden();
});

test('archive with books.archive returns 200 and twice returns 422', function () {
    seedRolesAndPermissions();
    $user = adminUser();
    $book = Book::create(['title' => 'B', 'slug' => 'b', 'status' => 'Draft']);

    $this->actingAs($user)
        ->postJson("/api/v1/books/{$book->id}/archive")
        ->assertOk()
        ->assertJsonPath('data.is_archived', true);

    $this->actingAs($user)
        ->postJson("/api/v1/books/{$book->id}/archive")
        ->assertStatus(422);
});

test('delete non-archived book returns 422', function () {
    seedRolesAndPermissions();
    $user = adminUser();
    $book = Book::create(['title' => 'B', 'slug' => 'b', 'status' => 'Draft']);

    $this->actingAs($user)
        ->deleteJson("/api/v1/books/{$book->id}")
        ->assertStatus(422);
});

test('delete archived book with books.delete returns 200 and soft deletes', function () {
    seedRolesAndPermissions();
    $user = adminUser();
    $book = Book::create(['title' => 'B', 'slug' => 'b', 'status' => 'Draft', 'is_archived' => true]);

    $this->actingAs($user)
        ->deleteJson("/api/v1/books/{$book->id}")
        ->assertOk();

    $this->assertSoftDeleted('books', ['id' => $book->id]);
});

test('isbn must be unique when present', function () {
    seedRolesAndPermissions();
    $user = adminUser();
    Book::create(['title' => 'First', 'slug' => 'first', 'status' => 'Draft', 'isbn' => '978-3-16-148410-0']);

    $this->actingAs($user)
        ->postJson('/api/v1/books', [
            'title' => 'Second',
            'status' => 'Draft',
            'isbn' => '978-3-16-148410-0',
        ])
        ->assertStatus(422);
});

test('page_count below zero is rejected', function () {
    seedRolesAndPermissions();
    $user = adminUser();

    $this->actingAs($user)
        ->postJson('/api/v1/books', [
            'title' => 'Bad Pages',
            'status' => 'Draft',
            'page_count' => -5,
        ])
        ->assertStatus(422);
});

test('search by title and filter by status work', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    Book::create(['title' => 'Unique Persian Tales', 'slug' => 'unique-persian-tales', 'status' => 'Published']);
    Book::create(['title' => 'Other Stories', 'slug' => 'other-stories', 'status' => 'Draft']);

    $response = $this->actingAs($user)->getJson('/api/v1/books?q=Persian');
    $response->assertOk();
    $titles = collect($response->json('data'))->pluck('title');
    expect($titles)->toContain('Unique Persian Tales');
    expect($titles)->not->toContain('Other Stories');

    $filtered = $this->actingAs($user)->getJson('/api/v1/books?status=Published');
    $filtered->assertOk();
    $statuses = collect($filtered->json('data'))->pluck('status')->unique()->values()->toArray();
    expect($statuses)->toBe(['Published']);
});
