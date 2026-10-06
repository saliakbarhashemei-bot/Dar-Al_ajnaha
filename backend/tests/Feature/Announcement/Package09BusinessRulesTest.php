<?php

use App\Models\Announcement;
use App\Models\Book;
use App\Models\Role;
use App\Models\User;

function rulesAdmin(): User
{
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    return $user;
}

function ruleBook(array $overrides = []): Book
{
    return Book::create(array_merge([
        'title' => 'Rule Book '.uniqid(),
        'slug' => 'rule-book-'.uniqid(),
        'status' => 'Published',
        'publication_date' => '2024-05-01',
        'edition' => '1st',
    ], $overrides));
}

test('New Book without book_id returns 422', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'Fresh Release',
            'type' => 'New Book',
            'status' => 'Draft',
        ])
        ->assertStatus(422);
});

test('New Book with book_id returns 201', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();
    $book = ruleBook();

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'Fresh Release',
            'type' => 'New Book',
            'status' => 'Draft',
            'book_id' => $book->id,
        ])
        ->assertCreated();
});

test('Reprint with book missing publication_date returns 422', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();
    $book = ruleBook(['publication_date' => null]);

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'Again',
            'type' => 'Reprint',
            'status' => 'Draft',
            'book_id' => $book->id,
        ])
        ->assertStatus(422);
});

test('Reprint with Draft book returns 422', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();
    $book = ruleBook(['status' => 'Draft']);

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'Again',
            'type' => 'Reprint',
            'status' => 'Draft',
            'book_id' => $book->id,
        ])
        ->assertStatus(422);
});

test('Reprint with Published book and date returns 201', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();
    $book = ruleBook(['status' => 'Published']);

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'Again',
            'type' => 'Reprint',
            'status' => 'Draft',
            'book_id' => $book->id,
        ])
        ->assertCreated();
});

test('Reprint with Scheduled book and date returns 201', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();
    $book = ruleBook(['status' => 'Scheduled']);

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'Coming Again',
            'type' => 'Reprint',
            'status' => 'Draft',
            'book_id' => $book->id,
        ])
        ->assertCreated();
});

test('New Edition with book missing edition returns 422', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();
    $book = ruleBook(['edition' => null]);

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'Second',
            'type' => 'New Edition',
            'status' => 'Draft',
            'book_id' => $book->id,
        ])
        ->assertStatus(422);
});

test('New Edition with book missing publication_date returns 422', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();
    $book = ruleBook(['publication_date' => null]);

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'Second',
            'type' => 'New Edition',
            'status' => 'Draft',
            'book_id' => $book->id,
        ])
        ->assertStatus(422);
});

test('News without book_id returns 201', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'General News',
            'type' => 'News',
            'status' => 'Draft',
        ])
        ->assertCreated();
});

test('update from News to New Book without book_id returns 422', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();
    $announcement = Announcement::create([
        'title' => 'Switch', 'slug' => 'switch', 'type' => 'News', 'status' => 'Draft',
    ]);

    $this->actingAs($user)
        ->putJson("/api/v1/announcements/{$announcement->id}", ['type' => 'New Book'])
        ->assertStatus(422);
});

test('delete book linked to announcement returns 422', function () {
    seedRolesAndPermissions();
    $user = rulesAdmin();
    $book = ruleBook(['is_archived' => true]);
    Announcement::create([
        'title' => 'Linked', 'slug' => 'linked', 'type' => 'News', 'status' => 'Draft',
        'book_id' => $book->id,
    ]);

    $this->actingAs($user)
        ->deleteJson("/api/v1/books/{$book->id}")
        ->assertStatus(422);
});
