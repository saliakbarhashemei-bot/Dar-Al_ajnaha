<?php

use App\Models\Announcement;
use App\Models\Book;
use App\Models\Contributor;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function limitedUser(string $roleName): array
{
    $user = User::factory()->create();
    $role = Role::where('name', $roleName)->first();
    $user->roles()->attach($role);

    return [$user, ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken]];
}

test('media edit without media.edit returns 403', function () {
    seedRolesAndPermissions();
    [$user, $auth] = limitedUser('announcer');
    $media = Media::create([
        'disk' => 'local', 'path' => 'media/a.jpg', 'file_name' => 'a.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'uploaded_by' => $user->id,
    ]);

    $this->withHeaders($auth)->putJson("/api/v1/media/{$media->id}", ['caption' => 'X'])->assertForbidden();
});

test('media replace without media.replace returns 403', function () {
    seedRolesAndPermissions();
    Storage::fake('local');
    [$user, $auth] = limitedUser('announcer');
    $media = Media::create([
        'disk' => 'local', 'path' => 'media/a.jpg', 'file_name' => 'a.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'width' => 600, 'height' => 800,
        'uploaded_by' => $user->id,
    ]);

    $this->withHeaders($auth)->post("/api/v1/media/{$media->id}/replace", [
        'file' => UploadedFile::fake()->image('b.jpg', 600, 800),
        'media_type' => 'Book Cover',
    ])->assertForbidden();
});

test('media archive without media.archive returns 403', function () {
    seedRolesAndPermissions();
    [$user, $auth] = limitedUser('announcer');
    $media = Media::create([
        'disk' => 'local', 'path' => 'media/a.jpg', 'file_name' => 'a.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'uploaded_by' => $user->id,
    ]);

    $this->withHeaders($auth)->postJson("/api/v1/media/{$media->id}/archive")->assertForbidden();
});

test('media delete without media.delete returns 403', function () {
    seedRolesAndPermissions();
    [$user, $auth] = limitedUser('announcer');
    $media = Media::create([
        'disk' => 'local', 'path' => 'media/a.jpg', 'file_name' => 'a.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'uploaded_by' => $user->id,
        'is_archived' => true,
    ]);

    $this->withHeaders($auth)->deleteJson("/api/v1/media/{$media->id}")->assertForbidden();
});

test('book delete without books.delete returns 403', function () {
    seedRolesAndPermissions();
    [$user, $auth] = limitedUser('announcer');
    $book = Book::create(['title' => 'B', 'slug' => 'b', 'status' => 'Draft', 'is_archived' => true]);

    $this->withHeaders($auth)->deleteJson("/api/v1/books/{$book->id}")->assertForbidden();
});

test('announcement archive and delete without permission return 403', function () {
    seedRolesAndPermissions();
    [$user, $auth] = limitedUser('contributor_manager');
    $announcement = Announcement::create(['title' => 'A', 'slug' => 'a', 'type' => 'News', 'status' => 'Draft']);

    $this->withHeaders($auth)->postJson("/api/v1/announcements/{$announcement->id}/archive")->assertForbidden();
    $this->withHeaders($auth)->deleteJson("/api/v1/announcements/{$announcement->id}")->assertForbidden();
});

test('user update of another user without users.edit returns 403', function () {
    seedRolesAndPermissions();
    [$user, $auth] = limitedUser('announcer');
    $other = User::factory()->create();

    $this->withHeaders($auth)->putJson("/api/v1/users/{$other->id}", ['name' => 'Hacked'])->assertForbidden();
});

test('contributor attach media without contributors.edit returns 403', function () {
    seedRolesAndPermissions();
    [$user, $auth] = limitedUser('announcer');
    $contributor = Contributor::create(['name' => 'P', 'slug' => 'p']);
    $media = Media::create([
        'disk' => 'local', 'path' => 'media/a.jpg', 'file_name' => 'a.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'width' => 600, 'height' => 800,
        'uploaded_by' => $user->id,
    ]);

    $this->withHeaders($auth)->postJson("/api/v1/contributors/{$contributor->id}/media", [
        'media_id' => $media->id,
        'media_type' => 'Person Photo',
    ])->assertForbidden();
});
