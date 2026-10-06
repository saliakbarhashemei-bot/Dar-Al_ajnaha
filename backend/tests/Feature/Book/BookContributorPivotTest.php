<?php

use App\Models\Book;
use App\Models\Contributor;
use App\Models\ContributorRole;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function pivotAdmin(): User
{
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    return $user;
}

test('attach contributor with role creates pivot row', function () {
    seedRolesAndPermissions();
    $user = pivotAdmin();
    $book = Book::create(['title' => 'Pivot Book', 'slug' => 'pivot-book', 'status' => 'Draft']);
    $contributor = Contributor::create(['name' => 'Writer', 'slug' => 'writer']);
    $role = ContributorRole::where('name', 'Author')->first();

    $this->actingAs($user)
        ->postJson("/api/v1/books/{$book->id}/contributors", [
            'contributor_id' => $contributor->id,
            'contributor_role_id' => $role->id,
        ])
        ->assertCreated();

    $this->assertDatabaseHas('book_contributor', [
        'book_id' => $book->id,
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $role->id,
    ]);
});

test('attach via role name string works (overview convention)', function () {
    seedRolesAndPermissions();
    $user = pivotAdmin();
    $book = Book::create(['title' => 'Role Name Book', 'slug' => 'role-name-book', 'status' => 'Draft']);
    $contributor = Contributor::create(['name' => 'Translator Person', 'slug' => 'translator-person']);

    $this->actingAs($user)
        ->postJson("/api/v1/books/{$book->id}/contributors", [
            'contributor_id' => $contributor->id,
            'role' => 'Translator',
        ])
        ->assertCreated();

    $role = ContributorRole::where('name', 'Translator')->first();
    $this->assertDatabaseHas('book_contributor', [
        'book_id' => $book->id,
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $role->id,
    ]);
});

test('same contributor can hold two roles on one book', function () {
    seedRolesAndPermissions();
    $user = pivotAdmin();
    $book = Book::create(['title' => 'Multi Role', 'slug' => 'multi-role', 'status' => 'Draft']);
    $contributor = Contributor::create(['name' => 'Multi', 'slug' => 'multi']);
    $author = ContributorRole::where('name', 'Author')->first();
    $editor = ContributorRole::where('name', 'Editor')->first();

    $this->actingAs($user)->postJson("/api/v1/books/{$book->id}/contributors", [
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $author->id,
    ])->assertCreated();

    $this->actingAs($user)->postJson("/api/v1/books/{$book->id}/contributors", [
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $editor->id,
    ])->assertCreated();

    expect(DB::table('book_contributor')->where('book_id', $book->id)->where('contributor_id', $contributor->id)->count())->toBe(2);
});

test('duplicate role assignment returns 422', function () {
    seedRolesAndPermissions();
    $user = pivotAdmin();
    $book = Book::create(['title' => 'Dup', 'slug' => 'dup', 'status' => 'Draft']);
    $contributor = Contributor::create(['name' => 'Dup Person', 'slug' => 'dup-person']);
    $role = ContributorRole::where('name', 'Author')->first();

    $this->actingAs($user)->postJson("/api/v1/books/{$book->id}/contributors", [
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $role->id,
    ])->assertCreated();

    $this->actingAs($user)->postJson("/api/v1/books/{$book->id}/contributors", [
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $role->id,
    ])->assertStatus(422);
});

test('update contributor role via put', function () {
    seedRolesAndPermissions();
    $user = pivotAdmin();
    $book = Book::create(['title' => 'Update Role', 'slug' => 'update-role', 'status' => 'Draft']);
    $contributor = Contributor::create(['name' => 'Changer', 'slug' => 'changer']);
    $author = ContributorRole::where('name', 'Author')->first();
    $translator = ContributorRole::where('name', 'Translator')->first();

    $this->actingAs($user)->postJson("/api/v1/books/{$book->id}/contributors", [
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $author->id,
    ])->assertCreated();

    $this->actingAs($user)->putJson("/api/v1/books/{$book->id}/contributors/{$contributor->id}", [
        'contributor_role_id' => $translator->id,
    ])->assertOk();

    $this->assertDatabaseHas('book_contributor', [
        'book_id' => $book->id,
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $translator->id,
    ]);
});

test('detach removes only the specified role row', function () {
    seedRolesAndPermissions();
    $user = pivotAdmin();
    $book = Book::create(['title' => 'Detach', 'slug' => 'detach', 'status' => 'Draft']);
    $contributor = Contributor::create(['name' => 'Leaver', 'slug' => 'leaver']);
    $author = ContributorRole::where('name', 'Author')->first();
    $editor = ContributorRole::where('name', 'Editor')->first();

    $this->actingAs($user)->postJson("/api/v1/books/{$book->id}/contributors", [
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $author->id,
    ]);
    $this->actingAs($user)->postJson("/api/v1/books/{$book->id}/contributors", [
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $editor->id,
    ]);

    $this->actingAs($user)->deleteJson("/api/v1/books/{$book->id}/contributors/{$contributor->id}", [
        'contributor_role_id' => $author->id,
    ])->assertOk();

    $this->assertDatabaseMissing('book_contributor', [
        'book_id' => $book->id,
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $author->id,
    ]);
    $this->assertDatabaseHas('book_contributor', [
        'book_id' => $book->id,
        'contributor_id' => $contributor->id,
        'contributor_role_id' => $editor->id,
    ]);
});

test('soft-delete book preserves pivot rows (Phase 6 §3.3)', function () {
    seedRolesAndPermissions();
    $user = pivotAdmin();
    $book = Book::create(['title' => 'Cascade', 'slug' => 'cascade', 'status' => 'Draft', 'is_archived' => true]);
    $contributor = Contributor::create(['name' => 'Kept', 'slug' => 'kept']);
    $role = ContributorRole::where('name', 'Author')->first();
    $book->contributors()->attach($contributor->id, ['contributor_role_id' => $role->id]);

    $this->actingAs($user)->deleteJson("/api/v1/books/{$book->id}")->assertOk();

    $this->assertSoftDeleted('books', ['id' => $book->id]);
    expect(DB::table('book_contributor')->where('book_id', $book->id)->count())->toBe(1);
});

test('delete contributor with books is blocked', function () {
    seedRolesAndPermissions();
    $user = pivotAdmin();
    $book = Book::create(['title' => 'Linked', 'slug' => 'linked', 'status' => 'Draft']);
    $contributor = Contributor::create(['name' => 'Linked Person', 'slug' => 'linked-person', 'is_archived' => true]);
    $role = ContributorRole::where('name', 'Author')->first();
    $book->contributors()->attach($contributor->id, ['contributor_role_id' => $role->id]);

    $this->actingAs($user)
        ->deleteJson("/api/v1/contributors/{$contributor->id}")
        ->assertStatus(422);
});
