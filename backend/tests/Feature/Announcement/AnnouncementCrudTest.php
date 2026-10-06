<?php

use App\Models\Announcement;
use App\Models\Book;
use App\Models\Role;
use App\Models\User;

function announcementAdmin(): User
{
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    return $user;
}

test('any auth user can list announcements', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/announcements')
        ->assertOk();
});

test('store without announcements.create returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    // contributor_manager has no announcement permissions
    $role = Role::where('name', 'contributor_manager')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'Nope',
            'type' => 'News',
            'status' => 'Draft',
        ])
        ->assertForbidden();
});

test('store with announcements.create returns 201', function () {
    seedRolesAndPermissions();
    $user = announcementAdmin();

    $this->actingAs($user)
        ->postJson('/api/v1/announcements', [
            'title' => 'Big News',
            'type' => 'News',
            'status' => 'Draft',
        ])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Big News');
});

test('show returns 200 with book relation', function () {
    seedRolesAndPermissions();
    $user = announcementAdmin();
    $book = Book::create(['title' => 'Linked', 'slug' => 'linked', 'status' => 'Published', 'publication_date' => '2024-01-01']);
    $announcement = Announcement::create(['title' => 'About Book', 'slug' => 'about-book', 'type' => 'News', 'status' => 'Draft', 'book_id' => $book->id]);

    $this->actingAs($user)
        ->getJson("/api/v1/announcements/{$announcement->id}")
        ->assertOk()
        ->assertJsonPath('data.book.title', 'Linked');
});

test('update without announcements.edit returns 403', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'contributor_manager')->first();
    $user->roles()->attach($role);
    $announcement = Announcement::create(['title' => 'Old', 'slug' => 'old', 'type' => 'News', 'status' => 'Draft']);

    $this->actingAs($user)
        ->putJson("/api/v1/announcements/{$announcement->id}", ['title' => 'New'])
        ->assertForbidden();
});

test('archive twice returns 422, delete unarchived returns 422', function () {
    seedRolesAndPermissions();
    $user = announcementAdmin();
    $announcement = Announcement::create(['title' => 'Arc', 'slug' => 'arc', 'type' => 'News', 'status' => 'Draft']);

    $this->actingAs($user)->postJson("/api/v1/announcements/{$announcement->id}/archive")->assertOk();
    $this->actingAs($user)->postJson("/api/v1/announcements/{$announcement->id}/archive")->assertStatus(422);
    $this->actingAs($user)->deleteJson("/api/v1/announcements/{$announcement->fresh()->id}")->assertOk();
});

test('delete unarchived announcement returns 422', function () {
    seedRolesAndPermissions();
    $user = announcementAdmin();
    $announcement = Announcement::create(['title' => 'Keep', 'slug' => 'keep', 'type' => 'News', 'status' => 'Draft']);

    $this->actingAs($user)->deleteJson("/api/v1/announcements/{$announcement->id}")->assertStatus(422);
});

test('search and filters work', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    Announcement::create(['title' => 'Unique Festival News', 'slug' => 'unique-festival', 'type' => 'Event', 'status' => 'Published']);
    Announcement::create(['title' => 'Other Thing', 'slug' => 'other-thing', 'type' => 'News', 'status' => 'Draft']);

    $search = $this->actingAs($user)->getJson('/api/v1/announcements?q=Festival');
    expect(collect($search->json('data'))->pluck('title'))->toContain('Unique Festival News');

    $filtered = $this->actingAs($user)->getJson('/api/v1/announcements?type=Event');
    expect(collect($filtered->json('data'))->pluck('title'))->toContain('Unique Festival News');
    expect(collect($filtered->json('data'))->pluck('title'))->not->toContain('Other Thing');
});

test('published status auto-sets published_at', function () {
    seedRolesAndPermissions();
    $user = announcementAdmin();

    $response = $this->actingAs($user)->postJson('/api/v1/announcements', [
        'title' => 'Live Now',
        'type' => 'News',
        'status' => 'Published',
    ])->assertCreated();

    expect($response->json('data.published_at'))->not->toBeNull();
});
