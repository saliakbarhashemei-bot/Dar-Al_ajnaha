<?php

use App\Models\Book;
use App\Models\Contributor;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function attachmentAdmin(): User
{
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    return $user;
}

function makeMedia(array $overrides = []): Media
{
    return Media::create(array_merge([
        'disk' => 'local',
        'path' => 'media/'.uniqid().'.jpg',
        'file_name' => 'test.jpg',
        'mime_type' => 'image/jpeg',
        'size' => 1234,
        'width' => 600,
        'height' => 800,
        'uploaded_by' => User::factory()->create()->id,
    ], $overrides));
}

test('attach media to book with Book Cover creates pivot row', function () {
    seedRolesAndPermissions();
    $user = attachmentAdmin();
    $book = Book::create(['title' => 'Cover Book', 'slug' => 'cover-book', 'status' => 'Draft']);
    $media = makeMedia();

    $this->actingAs($user)
        ->postJson("/api/v1/books/{$book->id}/media", [
            'media_id' => $media->id,
            'media_type' => 'Book Cover',
        ])
        ->assertCreated();

    $this->assertDatabaseHas('mediables', [
        'media_id' => $media->id,
        'mediable_type' => 'Book',
        'mediable_id' => $book->id,
        'media_type' => 'Book Cover',
    ]);
});

test('attach same media with same type twice returns 422', function () {
    seedRolesAndPermissions();
    $user = attachmentAdmin();
    $book = Book::create(['title' => 'Dup', 'slug' => 'dup', 'status' => 'Draft']);
    $media = makeMedia();

    $payload = ['media_id' => $media->id, 'media_type' => 'Book Cover'];
    $this->actingAs($user)->postJson("/api/v1/books/{$book->id}/media", $payload)->assertCreated();
    $this->actingAs($user)->postJson("/api/v1/books/{$book->id}/media", $payload)->assertStatus(422);
});

test('attach media with wrong MIME for type returns 422', function () {
    seedRolesAndPermissions();
    $user = attachmentAdmin();
    $book = Book::create(['title' => 'Wrong', 'slug' => 'wrong', 'status' => 'Draft']);
    $media = makeMedia(['mime_type' => 'application/pdf', 'file_name' => 'doc.pdf']);

    $this->actingAs($user)
        ->postJson("/api/v1/books/{$book->id}/media", [
            'media_id' => $media->id,
            'media_type' => 'Book Cover',
        ])
        ->assertStatus(422);
});

test('attach photo to contributor and list it', function () {
    seedRolesAndPermissions();
    $user = attachmentAdmin();
    $contributor = Contributor::create(['name' => 'Photo Person', 'slug' => 'photo-person']);
    $media = makeMedia();

    $this->actingAs($user)
        ->postJson("/api/v1/contributors/{$contributor->id}/media", [
            'media_id' => $media->id,
            'media_type' => 'Person Photo',
        ])
        ->assertCreated();

    $this->actingAs($user)
        ->getJson("/api/v1/contributors/{$contributor->id}/media")
        ->assertOk()
        ->assertJsonPath('data.0.media_type', 'Person Photo');
});

test('detach removes the pivot row', function () {
    seedRolesAndPermissions();
    $user = attachmentAdmin();
    $book = Book::create(['title' => 'Detach', 'slug' => 'detach', 'status' => 'Draft']);
    $media = makeMedia();

    $this->actingAs($user)->postJson("/api/v1/books/{$book->id}/media", [
        'media_id' => $media->id,
        'media_type' => 'Book Image',
    ])->assertCreated();

    $this->actingAs($user)
        ->deleteJson("/api/v1/books/{$book->id}/media/{$media->id}")
        ->assertOk();

    $this->assertDatabaseMissing('mediables', [
        'media_id' => $media->id,
        'mediable_type' => 'Book',
        'mediable_id' => $book->id,
    ]);
});

test('soft-delete book preserves its media pivots (Phase 6 §3.3)', function () {
    seedRolesAndPermissions();
    $user = attachmentAdmin();
    $book = Book::create(['title' => 'Gone', 'slug' => 'gone', 'status' => 'Draft', 'is_archived' => true]);
    $media = makeMedia();
    $book->media()->attach($media->id, ['media_type' => 'Book Cover']);

    $this->actingAs($user)->deleteJson("/api/v1/books/{$book->id}")->assertOk();

    $this->assertSoftDeleted('books', ['id' => $book->id]);
    expect(DB::table('mediables')->where('mediable_type', 'Book')->where('mediable_id', $book->id)->count())->toBe(1);
});

test('delete contributor removes its media pivots', function () {
    seedRolesAndPermissions();
    $user = attachmentAdmin();
    $contributor = Contributor::create(['name' => 'Gone Person', 'slug' => 'gone-person', 'is_archived' => true]);
    $media = makeMedia();
    $contributor->media()->attach($media->id, ['media_type' => 'Person Photo']);

    $this->actingAs($user)->deleteJson("/api/v1/contributors/{$contributor->id}")->assertOk();

    expect(DB::table('mediables')->where('mediable_type', 'Contributor')->where('mediable_id', $contributor->id)->count())->toBe(0);
});

test('delete media removes its pivots', function () {
    seedRolesAndPermissions();
    $user = attachmentAdmin();
    $book = Book::create(['title' => 'Keeps', 'slug' => 'keeps', 'status' => 'Draft']);
    $media = makeMedia(['is_archived' => true]);
    $book->media()->attach($media->id, ['media_type' => 'Book Cover']);

    $this->actingAs($user)->deleteJson("/api/v1/media/{$media->id}")->assertOk();

    expect(DB::table('mediables')->where('media_id', $media->id)->count())->toBe(0);
});

test('media attachments endpoint lists attached entities', function () {
    seedRolesAndPermissions();
    $user = attachmentAdmin();
    $book = Book::create(['title' => 'Attached To', 'slug' => 'attached-to', 'status' => 'Draft']);
    $media = makeMedia();
    $book->media()->attach($media->id, ['media_type' => 'Book Cover']);

    $this->actingAs($user)
        ->getJson("/api/v1/media/{$media->id}/attachments")
        ->assertOk()
        ->assertJsonPath('data.0.mediable_type', 'Book')
        ->assertJsonPath('data.0.title', 'Attached To')
        ->assertJsonPath('data.0.link', "/books/{$book->id}");
});

test('book show includes attached media with pivot type', function () {
    seedRolesAndPermissions();
    $user = attachmentAdmin();
    $book = Book::create(['title' => 'With Media', 'slug' => 'with-media', 'status' => 'Draft']);
    $media = makeMedia();
    $book->media()->attach($media->id, ['media_type' => 'Book Cover']);

    $this->actingAs($user)
        ->getJson("/api/v1/books/{$book->id}")
        ->assertOk()
        ->assertJsonPath('data.media.0.pivot_media_type', 'Book Cover');
});
