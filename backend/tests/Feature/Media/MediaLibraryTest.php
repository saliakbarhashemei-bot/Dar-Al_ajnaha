<?php

use App\Models\Book;
use App\Models\Media;
use App\Models\User;

test('media-types endpoint returns exactly 6 types', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/media-types');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(6);
});

test('library filters by mime_type and search, hides archived by default', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $uploader = User::factory()->create();

    Media::create([
        'disk' => 'local', 'path' => 'media/a.jpg', 'file_name' => 'sunset-cover.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'uploaded_by' => $uploader->id,
    ]);
    Media::create([
        'disk' => 'local', 'path' => 'media/b.pdf', 'file_name' => 'contract.pdf',
        'mime_type' => 'application/pdf', 'size' => 2000, 'uploaded_by' => $uploader->id,
    ]);
    Media::create([
        'disk' => 'local', 'path' => 'media/c.jpg', 'file_name' => 'old.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'uploaded_by' => $uploader->id,
        'is_archived' => true,
    ]);

    $mime = $this->actingAs($user)->getJson('/api/v1/media?mime_type=image/jpeg');
    $mime->assertOk();
    expect(collect($mime->json('data'))->pluck('file_name'))->toContain('sunset-cover.jpg');
    expect(collect($mime->json('data'))->pluck('file_name'))->not->toContain('contract.pdf');

    $search = $this->actingAs($user)->getJson('/api/v1/media?q=contract');
    $search->assertOk();
    expect(collect($search->json('data'))->pluck('file_name'))->toContain('contract.pdf');

    $default = $this->actingAs($user)->getJson('/api/v1/media');
    expect(collect($default->json('data'))->pluck('file_name'))->not->toContain('old.jpg');

    $archived = $this->actingAs($user)->getJson('/api/v1/media?is_archived=true');
    expect(collect($archived->json('data'))->pluck('file_name'))->toContain('old.jpg');
});

test('library filters by attached media_type and mediable_type', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $uploader = User::factory()->create();
    $book = Book::create(['title' => 'Filtered', 'slug' => 'filtered', 'status' => 'Draft']);

    $cover = Media::create([
        'disk' => 'local', 'path' => 'media/cover.jpg', 'file_name' => 'cover.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'uploaded_by' => $uploader->id,
    ]);
    $loose = Media::create([
        'disk' => 'local', 'path' => 'media/loose.jpg', 'file_name' => 'loose.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'uploaded_by' => $uploader->id,
    ]);
    $book->media()->attach($cover->id, ['media_type' => 'Book Cover']);

    $byType = $this->actingAs($user)->getJson('/api/v1/media?media_type=Book Cover');
    expect(collect($byType->json('data'))->pluck('file_name'))->toContain('cover.jpg');
    expect(collect($byType->json('data'))->pluck('file_name'))->not->toContain('loose.jpg');

    $byParent = $this->actingAs($user)->getJson('/api/v1/media?mediable_type=Book');
    expect(collect($byParent->json('data'))->pluck('file_name'))->toContain('cover.jpg');
    expect(collect($byParent->json('data'))->pluck('file_name'))->not->toContain('loose.jpg');
});
