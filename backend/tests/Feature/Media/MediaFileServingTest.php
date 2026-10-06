<?php

use App\Models\Announcement;
use App\Models\Book;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

function mediaFileAdmin(): User
{
    seedRolesAndPermissions();

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    return $admin;
}

/**
 * Seed a cover directly instead of going through the upload endpoint, so the
 * authorization state of the calling test is left untouched.
 */
function seedCoverMedia(): Media
{
    $path = 'media/'.now()->format('Y/m/').Str::uuid().'.jpg';
    Storage::disk('local')->put($path, 'fake-jpeg-bytes');

    return Media::create([
        'disk' => 'local',
        'path' => $path,
        'file_name' => 'cover.jpg',
        'mime_type' => 'image/jpeg',
        'size' => 15,
        'width' => 800,
        'height' => 1200,
        'uploaded_by' => User::factory()->create()->id,
        'is_archived' => false,
    ]);
}

test('media url points at the authorized file route', function () {
    $admin = mediaFileAdmin();

    $response = $this->actingAs($admin)
        ->postJson('/api/v1/media', [
            'file' => UploadedFile::fake()->image('cover.jpg', 800, 1200),
            'media_type' => 'Book Cover',
        ])->assertCreated();

    expect($response->json('data.url'))
        ->toBe("/api/v1/media/{$response->json('data.id')}/file");
});

test('the file route streams the file for an authorized user', function () {
    $media = seedCoverMedia();

    $response = $this->actingAs(mediaFileAdmin())->get("/api/v1/media/{$media->id}/file");

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('image');

    // Immutable: the path is content-addressed and never mutated in place.
    expect($response->headers->get('cache-control'))->toContain('immutable');

    Storage::disk($media->disk)->assertExists($media->path);
});

test('the file route requires authentication', function () {
    $media = seedCoverMedia();

    $this->getJson("/api/v1/media/{$media->id}/file")->assertUnauthorized();
});

test('storage paths never use the client supplied extension', function () {
    $admin = mediaFileAdmin();

    // A double extension that a naive implementation would preserve.
    $file = UploadedFile::fake()->image('payload.php.jpg', 800, 1200);

    $id = $this->actingAs($admin)
        ->postJson('/api/v1/media', [
            'file' => $file,
            'media_type' => 'Book Cover',
        ])->json('data.id');

    $path = Media::findOrFail($id)->path;

    expect($path)->toStartWith('media/')
        ->and(basename($path))->not->toContain('payload')
        ->and(basename($path))->toEndWith('.jpg');
});

test('attachments resolve parents without a query per row', function () {
    $admin = mediaFileAdmin();
    $media = seedCoverMedia();

    for ($i = 0; $i < 5; $i++) {
        $book = Book::create([
            'title' => "Book {$i}",
            'slug' => "book-{$i}",
            'status' => 'Draft',
        ]);

        $this->actingAs($admin)->postJson("/api/v1/books/{$book->id}/media", [
            'media_id' => $media->id,
            'media_type' => 'Book Cover',
        ])->assertSuccessful();
    }

    DB::flushQueryLog();
    DB::enableQueryLog();

    $response = $this->actingAs($admin)->getJson("/api/v1/media/{$media->id}/attachments")->assertOk();

    $queryCount = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect($response->json('data'))->toHaveCount(5);

    // One query for the pivot rows plus one batched query for the books,
    // instead of one query per attachment row.
    expect($queryCount)->toBeLessThan(4);
});

test('attachment titles and links are resolved for every type', function () {
    $admin = mediaFileAdmin();
    $media = seedCoverMedia();

    $book = Book::create(['title' => 'A Book', 'slug' => 'a-book', 'status' => 'Draft']);
    $announcement = Announcement::create([
        'title' => 'An Announcement',
        'slug' => 'an-announcement',
        'type' => 'News',
        'status' => 'Draft',
    ]);

    $this->actingAs($admin)->postJson("/api/v1/books/{$book->id}/media", [
        'media_id' => $media->id,
        'media_type' => 'Book Cover',
    ])->assertSuccessful();

    $this->actingAs($admin)->postJson("/api/v1/announcements/{$announcement->id}/media", [
        'media_id' => $media->id,
        'media_type' => 'Announcement Image',
    ])->assertSuccessful();

    $data = $this->actingAs($admin)
        ->getJson("/api/v1/media/{$media->id}/attachments")
        ->json('data');

    $byType = collect($data)->keyBy('mediable_type');

    expect($byType['Book']['title'])->toBe('A Book')
        ->and($byType['Book']['link'])->toBe("/books/{$book->id}")
        ->and($byType['Announcement']['title'])->toBe('An Announcement')
        ->and($byType['Announcement']['link'])->toBe("/announcements/{$announcement->id}");
});
