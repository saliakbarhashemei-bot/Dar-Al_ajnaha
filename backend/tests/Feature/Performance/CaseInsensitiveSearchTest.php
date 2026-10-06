<?php

use App\Models\Book;
use App\Models\Contributor;
use App\Models\Role;
use App\Models\User;

function searchAdmin(): User
{
    seedRolesAndPermissions();

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    return $admin;
}

test('book search is case insensitive', function () {
    $admin = searchAdmin();

    Book::create(['title' => 'The Persian Garden', 'slug' => 'the-persian-garden', 'status' => 'Draft']);

    $exact = $this->actingAs($admin)->getJson('/api/v1/books?q=Persian')->assertOk()->json('data');
    $lower = $this->actingAs($admin)->getJson('/api/v1/books?q=persian')->assertOk()->json('data');
    $upper = $this->actingAs($admin)->getJson('/api/v1/books?q=PERSIAN')->assertOk()->json('data');

    expect($exact)->toHaveCount(1)
        ->and($lower)->toHaveCount(1)
        ->and($upper)->toHaveCount(1);
});

test('book search matches title, slug, isbn and description', function () {
    $admin = searchAdmin();

    Book::create([
        'title' => 'Unrelated',
        'slug' => 'findable-slug',
        'status' => 'Draft',
    ]);
    Book::create([
        'title' => 'Another',
        'slug' => 'another',
        'isbn' => '978-3-16-148410-0',
        'status' => 'Draft',
    ]);
    Book::create([
        'title' => 'Third',
        'slug' => 'third',
        'description' => 'a rare description',
        'status' => 'Draft',
    ]);

    expect($this->actingAs($admin)->getJson('/api/v1/books?q=findable')->json('data'))->toHaveCount(1)
        ->and($this->actingAs($admin)->getJson('/api/v1/books?q=148410')->json('data'))->toHaveCount(1)
        ->and($this->actingAs($admin)->getJson('/api/v1/books?q=rare')->json('data'))->toHaveCount(1);
});

test('contributor search is case insensitive', function () {
    $admin = searchAdmin();

    Contributor::create(['name' => 'Simin Behbahani', 'slug' => 'simin-behbahani']);

    expect($this->actingAs($admin)->getJson('/api/v1/contributors?q=simin')->json('data'))->toHaveCount(1)
        ->and($this->actingAs($admin)->getJson('/api/v1/contributors?q=BEHBAHANI')->json('data'))->toHaveCount(1);
});

test('a wildcard in the search term is treated as a literal', function () {
    $admin = searchAdmin();

    Book::create(['title' => 'A Book', 'slug' => 'a-book', 'status' => 'Draft']);
    Book::create(['title' => 'Another Book', 'slug' => 'another-book', 'status' => 'Draft']);

    // An unescaped `%` would match every row.
    $results = $this->actingAs($admin)->getJson('/api/v1/books?q=%25')->assertOk()->json('data');

    expect($results)->toHaveCount(0);
});

test('an underscore in the search term is a literal, not a single-character wildcard', function () {
    $admin = searchAdmin();

    Book::create(['title' => 'Exact', 'slug' => 'exact', 'status' => 'Draft']);
    Book::create(['title' => 'Exactness', 'slug' => 'exactness', 'status' => 'Draft']);

    // Unescaped, `_` would match "Exactness" as well; escaped it matches
    // nothing, because no title contains a literal underscore.
    $results = $this->actingAs($admin)->getJson('/api/v1/books?q=exac_')->assertOk()->json('data');

    expect($results)->toHaveCount(0);
});

test('a literal underscore in a title is searchable', function () {
    $admin = searchAdmin();

    Book::create(['title' => 'exac_t', 'slug' => 'exac-t', 'status' => 'Draft']);
    Book::create(['title' => 'exactness', 'slug' => 'exactness-2', 'status' => 'Draft']);

    $results = $this->actingAs($admin)->getJson('/api/v1/books?q=exac_')->assertOk()->json('data');

    expect($results)->toHaveCount(1)
        ->and($results[0]['title'])->toBe('exac_t');
});

test('searching for a quote does not break the query', function () {
    $admin = searchAdmin();

    Book::create(['title' => "O'Brien's Book", 'slug' => 'obriens-book', 'status' => 'Draft']);

    $this->actingAs($admin)
        ->getJson("/api/v1/books?q=O'Brien")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('an empty or blank search returns the unfiltered list', function () {
    $admin = searchAdmin();

    Book::create(['title' => 'One', 'slug' => 'one', 'status' => 'Draft']);
    Book::create(['title' => 'Two', 'slug' => 'two', 'status' => 'Draft']);

    expect($this->actingAs($admin)->getJson('/api/v1/books?q=')->json('data'))->toHaveCount(2)
        ->and($this->actingAs($admin)->getJson('/api/v1/books?q=%20%20')->json('data'))->toHaveCount(2)
        ->and($this->actingAs($admin)->getJson('/api/v1/books')->json('data'))->toHaveCount(2);
});

test('user, role and permission search is case insensitive', function () {
    $admin = searchAdmin();

    User::factory()->create(['name' => 'Zahra Rahnavard']);

    expect($this->actingAs($admin)->getJson('/api/v1/users?search=zahra')->json('data'))->toHaveCount(1)
        ->and($this->actingAs($admin)->getJson('/api/v1/users?search=ZAHRA')->json('data'))->toHaveCount(1)
        ->and($this->actingAs($admin)->getJson('/api/v1/roles?search=ADMIN')->json('data'))->toHaveCount(1)
        ->and($this->actingAs($admin)->getJson('/api/v1/permissions?search=BOOKS.CREATE')->json('data'))->toHaveCount(1);
});
