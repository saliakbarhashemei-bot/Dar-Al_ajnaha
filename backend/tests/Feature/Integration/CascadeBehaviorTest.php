<?php

use App\Models\Announcement;
use App\Models\Book;
use App\Models\Contributor;
use App\Models\ContributorRole;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function cascadeAdmin(): array
{
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    return [$user, ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken]];
}

test('archive keeps all relations intact', function () {
    seedRolesAndPermissions();
    [$user, $auth] = cascadeAdmin();

    $contributor = Contributor::create(['name' => 'Archived Author', 'slug' => 'archived-author']);
    $book = Book::create(['title' => 'Archived Book', 'slug' => 'archived-book', 'status' => 'Published', 'publication_date' => '2024-01-01']);
    $authorRole = ContributorRole::where('name', 'Author')->first();
    $book->contributors()->attach($contributor->id, ['contributor_role_id' => $authorRole->id]);

    $media = Media::create([
        'disk' => 'local', 'path' => 'media/a.jpg', 'file_name' => 'a.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'width' => 600, 'height' => 800,
        'uploaded_by' => $user->id,
    ]);
    $book->media()->attach($media->id, ['media_type' => 'Book Cover']);

    $announcement = Announcement::create([
        'title' => 'About Archived', 'slug' => 'about-archived', 'type' => 'News', 'status' => 'Draft', 'book_id' => $book->id,
    ]);

    $this->withHeaders($auth)->postJson("/api/v1/books/{$book->id}/archive")->assertOk();

    $this->assertDatabaseHas('book_contributor', ['book_id' => $book->id]);
    $this->assertDatabaseHas('mediables', ['mediable_id' => $book->id, 'mediable_type' => 'Book']);
    $this->assertDatabaseHas('announcements', ['book_id' => $book->id]);
});

test('soft-delete hides from default list but relations survive', function () {
    seedRolesAndPermissions();
    [$user, $auth] = cascadeAdmin();

    $contributor = Contributor::create(['name' => 'Soft Author', 'slug' => 'soft-author']);
    $book = Book::create(['title' => 'Soft Book', 'slug' => 'soft-book', 'status' => 'Draft', 'is_archived' => true]);
    $authorRole = ContributorRole::where('name', 'Author')->first();
    $book->contributors()->attach($contributor->id, ['contributor_role_id' => $authorRole->id]);

    $this->withHeaders($auth)->deleteJson("/api/v1/books/{$book->id}")->assertOk();

    $list = $this->withHeaders($auth)->getJson('/api/v1/books')->assertOk();
    expect(collect($list->json('data'))->pluck('id'))->not->toContain($book->id);

    $this->assertDatabaseHas('book_contributor', ['book_id' => $book->id]);
});

test('restore brings soft-deleted book back', function () {
    seedRolesAndPermissions();
    [$user, $auth] = cascadeAdmin();

    $book = Book::create(['title' => 'Restore Me', 'slug' => 'restore-me', 'status' => 'Draft', 'is_archived' => true]);
    $this->withHeaders($auth)->deleteJson("/api/v1/books/{$book->id}")->assertOk();

    $book->restore();

    $list = $this->withHeaders($auth)->getJson('/api/v1/books?is_archived=true')->assertOk();
    expect(collect($list->json('data'))->pluck('id'))->toContain($book->id);
});

test('hard-delete book with announcement returns 422', function () {
    seedRolesAndPermissions();
    [$user, $auth] = cascadeAdmin();

    $book = Book::create(['title' => 'Linked', 'slug' => 'linked', 'status' => 'Draft', 'is_archived' => true]);
    Announcement::create([
        'title' => 'Link', 'slug' => 'link', 'type' => 'News', 'status' => 'Draft', 'book_id' => $book->id,
    ]);

    $this->withHeaders($auth)->deleteJson("/api/v1/books/{$book->id}")->assertStatus(422);
});

test('hard-delete contributor with books returns 422', function () {
    seedRolesAndPermissions();
    [$user, $auth] = cascadeAdmin();

    $contributor = Contributor::create(['name' => 'Busy', 'slug' => 'busy', 'is_archived' => true]);
    $book = Book::create(['title' => 'Uses Busy', 'slug' => 'uses-busy', 'status' => 'Draft']);
    $authorRole = ContributorRole::where('name', 'Author')->first();
    $book->contributors()->attach($contributor->id, ['contributor_role_id' => $authorRole->id]);

    $this->withHeaders($auth)->deleteJson("/api/v1/contributors/{$contributor->id}")->assertStatus(422);
});

test('hard-delete media removes pivot row only', function () {
    seedRolesAndPermissions();
    [$user, $auth] = cascadeAdmin();

    $book = Book::create(['title' => 'Media Owner', 'slug' => 'media-owner', 'status' => 'Draft']);
    $media = Media::create([
        'disk' => 'local', 'path' => 'media/gone.jpg', 'file_name' => 'gone.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'width' => 600, 'height' => 800,
        'uploaded_by' => $user->id, 'is_archived' => true,
    ]);
    $book->media()->attach($media->id, ['media_type' => 'Book Cover']);

    $this->withHeaders($auth)->deleteJson("/api/v1/media/{$media->id}")->assertOk();

    expect(DB::table('mediables')->where('media_id', $media->id)->count())->toBe(0);
    $this->assertDatabaseHas('books', ['id' => $book->id]);
});
