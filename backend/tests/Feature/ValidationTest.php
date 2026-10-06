<?php

use App\Models\Book;
use App\Models\Media;
use App\Models\Role;
use App\Models\User;

function validationAdmin(): array
{
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    return [$user, ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken]];
}

test('book with invalid status is rejected', function () {
    seedRolesAndPermissions();
    [, $auth] = validationAdmin();

    $this->withHeaders($auth)->postJson('/api/v1/books', [
        'title' => 'Bad Status',
        'status' => 'Lost',
    ])->assertStatus(422);
});

test('book with malformed ISBN is rejected', function () {
    seedRolesAndPermissions();
    [, $auth] = validationAdmin();

    $this->withHeaders($auth)->postJson('/api/v1/books', [
        'title' => 'Bad ISBN',
        'status' => 'Draft',
        'isbn' => 'not-an-isbn!!!',
    ])->assertStatus(422);
});

test('announcement with invalid type is rejected', function () {
    seedRolesAndPermissions();
    [, $auth] = validationAdmin();

    $this->withHeaders($auth)->postJson('/api/v1/announcements', [
        'title' => 'Bad Type',
        'type' => 'Push Notification',
        'status' => 'Draft',
    ])->assertStatus(422);
});

test('announcement scheduled without scheduled_at is rejected', function () {
    seedRolesAndPermissions();
    [, $auth] = validationAdmin();

    $this->withHeaders($auth)->postJson('/api/v1/announcements', [
        'title' => 'No Time',
        'type' => 'News',
        'status' => 'Scheduled',
    ])->assertStatus(422);
});

test('user with invalid email and short password is rejected', function () {
    seedRolesAndPermissions();
    [$user, $auth] = validationAdmin();
    $role = Role::where('name', 'admin')->first();

    $this->withHeaders($auth)->postJson('/api/v1/users', [
        'name' => 'Bad',
        'email' => 'not-an-email',
        'password' => 'short',
        'password_confirmation' => 'short',
        'role_ids' => [$role->id],
    ])->assertStatus(422);
});

test('contributor with invalid email and website is rejected', function () {
    seedRolesAndPermissions();
    [, $auth] = validationAdmin();

    $this->withHeaders($auth)->postJson('/api/v1/contributors', [
        'name' => 'Bad Contact',
        'email' => 'nope',
        'website' => 'not a url',
    ])->assertStatus(422);
});

test('role attach with unknown permission id is rejected', function () {
    seedRolesAndPermissions();
    [, $auth] = validationAdmin();
    $role = Role::where('name', 'announcer')->first();

    $this->withHeaders($auth)->putJson("/api/v1/roles/{$role->id}/permissions", [
        'permission_ids' => [999999],
    ])->assertStatus(422);
});

test('media attach with unknown type is rejected', function () {
    seedRolesAndPermissions();
    [, $auth] = validationAdmin();
    $book = Book::create(['title' => 'V', 'slug' => 'v', 'status' => 'Draft']);
    $media = Media::create([
        'disk' => 'local', 'path' => 'media/x.jpg', 'file_name' => 'x.jpg',
        'mime_type' => 'image/jpeg', 'size' => 100, 'uploaded_by' => User::factory()->create()->id,
    ]);

    $this->withHeaders($auth)->postJson("/api/v1/books/{$book->id}/media", [
        'media_id' => $media->id,
        'media_type' => 'Hologram',
    ])->assertStatus(422);
});
