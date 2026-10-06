<?php

use App\Models\Media;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function mediaAdmin(): User
{
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    return $user;
}

test('upload valid image returns 201', function () {
    seedRolesAndPermissions();
    Storage::fake('local');
    $user = mediaAdmin();

    $file = UploadedFile::fake()->image('cover.jpg', 600, 800);

    // multipart upload requires post() (postJson does not send files)
    $response = $this->actingAs($user)->post('/api/v1/media', [
        'file' => $file,
        'media_type' => 'Book Cover',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.mime_type', 'image/jpeg');

    Storage::disk('local')->assertExists($response->json('data.id') ? Media::find($response->json('data.id'))->path : 'missing');
});

test('upload wrong MIME for media_type returns 422', function () {
    seedRolesAndPermissions();
    Storage::fake('local');
    $user = mediaAdmin();

    $file = UploadedFile::fake()->image('photo.jpg', 600, 800);

    $this->actingAs($user)->post('/api/v1/media', [
        'file' => $file,
        'media_type' => 'Document',
    ])->assertStatus(422);
});

test('upload too large returns 422', function () {
    seedRolesAndPermissions();
    Storage::fake('local');
    $user = mediaAdmin();

    $file = UploadedFile::fake()->image('big.jpg', 600, 800);
    file_put_contents($file->getPathname(), random_bytes(6 * 1024 * 1024), FILE_APPEND);

    $this->actingAs($user)->post('/api/v1/media', [
        'file' => $file,
        'media_type' => 'Book Cover',
    ])->assertStatus(422);
});

test('upload wrong dimensions returns 422', function () {
    seedRolesAndPermissions();
    Storage::fake('local');
    $user = mediaAdmin();

    $file = UploadedFile::fake()->image('tiny.jpg', 50, 50);

    $this->actingAs($user)->post('/api/v1/media', [
        'file' => $file,
        'media_type' => 'Book Cover',
    ])->assertStatus(422);
});

test('upload valid PDF document returns 201', function () {
    seedRolesAndPermissions();
    Storage::fake('local');
    $user = mediaAdmin();

    $path = tempnam(sys_get_temp_dir(), 'pdf');
    file_put_contents($path, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
    $file = new UploadedFile($path, 'doc.pdf', 'application/pdf', null, true);

    $this->actingAs($user)->post('/api/v1/media', [
        'file' => $file,
        'media_type' => 'Document',
    ])->assertCreated()
        ->assertJsonPath('data.mime_type', 'application/pdf');
});

test('upload without media.upload returns 403', function () {
    seedRolesAndPermissions();
    Storage::fake('local');
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);

    $file = UploadedFile::fake()->image('cover.jpg', 600, 800);

    $this->actingAs($user)->post('/api/v1/media', [
        'file' => $file,
        'media_type' => 'Book Cover',
    ])->assertForbidden();
});

test('replace existing media returns 200', function () {
    seedRolesAndPermissions();
    Storage::fake('local');
    $user = mediaAdmin();

    $original = $this->actingAs($user)->post('/api/v1/media', [
        'file' => UploadedFile::fake()->image('cover.jpg', 600, 800),
        'media_type' => 'Book Cover',
    ])->assertCreated();
    $id = $original->json('data.id');

    $this->actingAs($user)->post("/api/v1/media/{$id}/replace", [
        'file' => UploadedFile::fake()->image('new.jpg', 500, 700),
        'media_type' => 'Book Cover',
    ])->assertOk()
        ->assertJsonPath('data.file_name', 'new.jpg');
});

test('archive then delete works, delete without archive is blocked', function () {
    seedRolesAndPermissions();
    Storage::fake('local');
    $user = mediaAdmin();

    $created = $this->actingAs($user)->post('/api/v1/media', [
        'file' => UploadedFile::fake()->image('cover.jpg', 600, 800),
        'media_type' => 'Book Cover',
    ])->assertCreated();
    $id = $created->json('data.id');

    $this->actingAs($user)->deleteJson("/api/v1/media/{$id}")->assertStatus(422);

    $this->actingAs($user)->postJson("/api/v1/media/{$id}/archive")->assertOk();

    $this->actingAs($user)->deleteJson("/api/v1/media/{$id}")->assertOk();
    $this->assertSoftDeleted('media', ['id' => $id]);
});
