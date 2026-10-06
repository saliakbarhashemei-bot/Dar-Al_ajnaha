<?php

use App\Models\Book;
use App\Models\Contributor;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

test('full lifecycle walk across all 12 packages', function () {
    seedRolesAndPermissions();
    Storage::fake('local');

    // 1. Admin user logs in
    $admin = User::factory()->create([
        'email' => 'admin@example.com',
        'password' => Hash::make('password123'),
    ]);
    $adminRole = Role::where('name', 'admin')->first();
    $admin->roles()->attach($adminRole);

    $login = $this->postJson('/api/v1/auth/login', [
        'email' => 'admin@example.com',
        'password' => 'password123',
    ]);
    $login->assertOk();
    $token = $login->json('data.token');
    $authHeader = ['Authorization' => "Bearer {$token}"];

    // 2. Creates a Contributor (Author)
    $contributor = $this->withHeaders($authHeader)
        ->postJson('/api/v1/contributors', [
            'name' => 'Rumi',
            'biography' => 'Poet',
        ])
        ->assertCreated()
        ->json('data');

    // 3. Creates a Book with the Author attached
    $book = $this->withHeaders($authHeader)
        ->postJson('/api/v1/books', [
            'title' => 'Masnavi',
            'status' => 'Published',
            'publication_date' => '2024-01-01',
            'edition' => '1st',
            'contributors' => [
                ['contributor_id' => $contributor['id'], 'role' => 'Author'],
            ],
        ])
        ->assertCreated()
        ->json('data');

    expect($book['contributors'][0]['role_name'])->toBe('Author');
    expect($book['contributors'][0]['people'][0]['name'])->toBe('Rumi');

    // 4. Uploads a Book Cover image and attaches to the Book
    $cover = $this->withHeaders($authHeader)
        ->post('/api/v1/media', [
            'file' => UploadedFile::fake()->image('cover.jpg', 600, 800),
            'media_type' => 'Book Cover',
        ])
        ->assertCreated()
        ->json('data');

    $this->withHeaders($authHeader)
        ->postJson("/api/v1/books/{$book['id']}/media", [
            'media_id' => $cover['id'],
            'media_type' => 'Book Cover',
        ])
        ->assertCreated();

    // 5. Creates an Announcement of type "New Book" linked to the Book
    $announcement = $this->withHeaders($authHeader)
        ->postJson('/api/v1/announcements', [
            'title' => 'Masnavi is here',
            'type' => 'New Book',
            'status' => 'Published',
            'book_id' => $book['id'],
        ])
        ->assertCreated()
        ->json('data');

    expect($announcement['book']['title'])->toBe('Masnavi');

    // 6. Attaches an Announcement Image to the Announcement
    $image = $this->withHeaders($authHeader)
        ->post('/api/v1/media', [
            'file' => UploadedFile::fake()->image('announce.jpg', 800, 600),
            'media_type' => 'Announcement Image',
        ])
        ->assertCreated()
        ->json('data');

    $this->withHeaders($authHeader)
        ->postJson("/api/v1/announcements/{$announcement['id']}/media", [
            'media_id' => $image['id'],
            'media_type' => 'Announcement Image',
        ])
        ->assertCreated();

    // 7. Verifies all relations load correctly via the API
    $bookShow = $this->withHeaders($authHeader)->getJson("/api/v1/books/{$book['id']}")->assertOk()->json('data');
    expect($bookShow['media'][0]['pivot_media_type'])->toBe('Book Cover');
    expect($bookShow['contributors'][0]['people'][0]['name'])->toBe('Rumi');

    $announcementShow = $this->withHeaders($authHeader)->getJson("/api/v1/announcements/{$announcement['id']}")->assertOk()->json('data');
    expect($announcementShow['media'][0]['pivot_media_type'])->toBe('Announcement Image');

    $contributorShow = $this->withHeaders($authHeader)->getJson("/api/v1/contributors/{$contributor['id']}")->assertOk()->json('data');
    expect($contributorShow['books_count'])->toBe(1);

    // 8. Archives the Book (Announcement FK restricts — archive != delete, should work)
    $this->withHeaders($authHeader)
        ->postJson("/api/v1/books/{$book['id']}/archive")
        ->assertOk()
        ->assertJsonPath('data.is_archived', true);

    // 9. Attempts to delete the Book — fails with 422 "Announcement linked"
    $this->withHeaders($authHeader)
        ->deleteJson("/api/v1/books/{$book['id']}")
        ->assertStatus(422);

    // 10. Archives the Announcement, then deletes it
    $this->withHeaders($authHeader)
        ->postJson("/api/v1/announcements/{$announcement['id']}/archive")
        ->assertOk();

    $this->withHeaders($authHeader)
        ->deleteJson("/api/v1/announcements/{$announcement['id']}")
        ->assertOk();

    // 11. Now deletes the Book (cascade-cleans pivot, but not the Contributor)
    $this->withHeaders($authHeader)
        ->deleteJson("/api/v1/books/{$book['id']}")
        ->assertOk();

    $this->assertSoftDeleted('books', ['id' => $book['id']]);
    $this->assertDatabaseHas('contributors', ['id' => $contributor['id']]);
    // Soft-delete preserves pivot rows per spec §3.3 (CascadeBehaviorTest)
});
