<?php

use App\Models\Announcement;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;

test('attach Announcement Image to announcement creates pivot row', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);
    $uploader = User::factory()->create();

    $announcement = Announcement::create([
        'title' => 'Visual', 'slug' => 'visual', 'type' => 'News', 'status' => 'Draft',
    ]);
    $media = Media::create([
        'disk' => 'local', 'path' => 'media/a.jpg', 'file_name' => 'a.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'width' => 800, 'height' => 600,
        'uploaded_by' => $uploader->id,
    ]);

    $this->actingAs($user)
        ->postJson("/api/v1/announcements/{$announcement->id}/media", [
            'media_id' => $media->id,
            'media_type' => 'Announcement Image',
        ])
        ->assertCreated();

    $this->assertDatabaseHas('mediables', [
        'media_id' => $media->id,
        'mediable_type' => 'Announcement',
        'mediable_id' => $announcement->id,
        'media_type' => 'Announcement Image',
    ]);
});

test('attach wrong media_type to announcement returns 422', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);
    $uploader = User::factory()->create();

    $announcement = Announcement::create([
        'title' => 'Visual', 'slug' => 'visual', 'type' => 'News', 'status' => 'Draft',
    ]);
    $media = Media::create([
        'disk' => 'local', 'path' => 'media/a.jpg', 'file_name' => 'a.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'width' => 800, 'height' => 600,
        'uploaded_by' => $uploader->id,
    ]);

    // A PDF attached as Announcement Image must fail MIME validation
    $pdf = Media::create([
        'disk' => 'local', 'path' => 'media/b.pdf', 'file_name' => 'b.pdf',
        'mime_type' => 'application/pdf', 'size' => 1000,
        'uploaded_by' => $uploader->id,
    ]);

    $this->actingAs($user)
        ->postJson("/api/v1/announcements/{$announcement->id}/media", [
            'media_id' => $pdf->id,
            'media_type' => 'Announcement Image',
        ])
        ->assertStatus(422);
});

test('announcement show includes attached media', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);
    $uploader = User::factory()->create();

    $announcement = Announcement::create([
        'title' => 'Visual', 'slug' => 'visual', 'type' => 'News', 'status' => 'Draft',
    ]);
    $media = Media::create([
        'disk' => 'local', 'path' => 'media/a.jpg', 'file_name' => 'a.jpg',
        'mime_type' => 'image/jpeg', 'size' => 1000, 'width' => 800, 'height' => 600,
        'uploaded_by' => $uploader->id,
    ]);
    $announcement->media()->attach($media->id, ['media_type' => 'Announcement Image']);

    $this->actingAs($user)
        ->getJson("/api/v1/announcements/{$announcement->id}")
        ->assertOk()
        ->assertJsonPath('data.media.0.pivot_media_type', 'Announcement Image');
});
