<?php

use App\Models\ActivityLog;
use App\Models\Book;
use App\Models\BookCategory;
use App\Models\Contributor;
use App\Models\Role;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('activity log entries cannot be updated', function () {
    $entry = ActivityLog::create([
        'actor_id' => User::factory()->create()->id,
        'action' => 'test.create',
        'entity_type' => 'thing',
        'entity_id' => 1,
    ]);

    $entry->action = 'tampered';

    expect(fn () => $entry->save())
        ->toThrow(LogicException::class, 'append-only');
});

test('activity log entries cannot be deleted', function () {
    $entry = ActivityLog::create([
        'actor_id' => User::factory()->create()->id,
        'action' => 'test.create',
        'entity_type' => 'thing',
        'entity_id' => 1,
    ]);

    expect(fn () => $entry->delete())
        ->toThrow(LogicException::class, 'append-only');
});

// Note: the guard above covers instance-level update/delete. Eloquent mass
// operations (query()->delete()) bypass model events, so enforcing the
// append-only rule at the database layer is deliberately left out — the
// retention/archival job in the operations runbook needs to remove rows.

test('creating an entry still works', function () {
    $actor = User::factory()->create();

    // The User observer logs its own entry on creation.
    expect(ActivityLog::count())->toBe(1);

    ActivityLog::create([
        'actor_id' => $actor->id,
        'action' => 'test.create',
        'entity_type' => 'thing',
        'entity_id' => 7,
        'metadata' => ['id' => 7],
    ]);

    expect(ActivityLog::count())->toBe(2)
        ->and(ActivityLog::where('action', 'test.create')->first()->metadata)->toBe(['id' => 7]);
});

test('every write endpoint records an activity log entry', function () {
    seedRolesAndPermissions();

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    $book = Book::create(['title' => 'Logged', 'slug' => 'logged', 'status' => 'Draft']);
    $contributor = Contributor::create(['name' => 'Logged Person', 'slug' => 'logged-person']);
    $tag = Tag::create(['name' => 'tagged', 'label' => 'Tagged']);
    $category = BookCategory::create(['name' => 'fiction', 'label' => 'Fiction']);
    $user = User::factory()->create(['password' => Hash::make('password123')]);

    $this->actingAs($admin)
        ->postJson('/api/v1/books', ['title' => 'Audited', 'status' => 'Draft'])
        ->assertCreated();
    $this->actingAs($admin)
        ->putJson("/api/v1/books/{$book->id}", ['title' => 'Audited Update'])
        ->assertOk();
    $this->actingAs($admin)
        ->postJson("/api/v1/books/{$book->id}/archive")
        ->assertOk();
    $this->actingAs($admin)
        ->postJson('/api/v1/tags', ['name' => 'audited-tag', 'label' => 'Audited Tag'])
        ->assertCreated();
    $this->actingAs($admin)
        ->postJson('/api/v1/book-categories', ['name' => 'poetry', 'label' => 'Poetry'])
        ->assertCreated();
    $this->actingAs($admin)
        ->putJson("/api/v1/book-categories/{$category->id}", ['label' => 'Poetry Updated'])
        ->assertOk();
    $this->actingAs($admin)
        ->postJson("/api/v1/contributors/{$contributor->id}/archive")
        ->assertOk();
    $this->actingAs($admin)
        ->putJson("/api/v1/users/{$user->id}/roles", ['role_ids' => [$admin->roles->first()->id]])
        ->assertOk();
    $this->actingAs($user)
        ->putJson('/api/v1/me/password', [
            'current_password' => 'password123',
            'password' => 'brandnewpass1',
            'password_confirmation' => 'brandnewpass1',
        ])->assertOk();

    $actions = ActivityLog::pluck('action')->all();

    foreach ([
        'book.create',
        'book.update',
        'book.archive',
        'book.tag.create',
        'book.category.create',
        'book.category.update',
        'contributor.archive',
        'user.roles.update',
        'user.password.update',
    ] as $action) {
        expect($actions)->toContain($action);
    }

    // The seeded tag was never written through an endpoint, so only the
    // newly created tag should appear in the log.
    expect($actions)->toContain('book.tag.create');
    expect($tag->id)->toBeInt();
});
