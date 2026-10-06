<?php

use App\Models\Book;
use App\Models\Contributor;
use App\Models\ContributorRole;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function n1Admin(): User
{
    seedRolesAndPermissions();

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    return $admin;
}

function countQueries(callable $callback): int
{
    DB::flushQueryLog();
    DB::enableQueryLog();

    $callback();

    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $count;
}

test('the books index does not query contributor roles per row', function () {
    $admin = n1Admin();

    $role = ContributorRole::first();

    for ($i = 0; $i < 15; $i++) {
        $book = Book::create([
            'title' => "Book {$i}",
            'slug' => "n1-book-{$i}",
            'status' => 'Draft',
        ]);

        $book->contributors()->attach(Contributor::create([
            'name' => "Person {$i}",
            'slug' => "n1-person-{$i}",
        ])->id, [
            'contributor_role_id' => $role->id,
        ]);
    }

    $queries = countQueries(fn () => $this->actingAs($admin)->getJson('/api/v1/books')->assertOk());

    // One paginated query plus the eager loads for category, tags,
    // contributors and the count. Anything per-row would scale with 15.
    expect($queries)->toBeLessThan(10);
});

test('the contributors index does not re-count books per row', function () {
    $admin = n1Admin();

    for ($i = 0; $i < 15; $i++) {
        Contributor::create([
            'name' => "Person {$i}",
            'slug' => "n1-c-person-{$i}",
        ]);
    }

    $queries = countQueries(fn () => $this->actingAs($admin)->getJson('/api/v1/contributors')->assertOk());

    expect($queries)->toBeLessThan(10);
});

test('books_count is still present on the contributors index', function () {
    $admin = n1Admin();

    $contributor = Contributor::create(['name' => 'Counted', 'slug' => 'counted']);

    $book = Book::create(['title' => 'Linked', 'slug' => 'linked', 'status' => 'Draft']);
    $book->contributors()->attach($contributor->id, [
        'contributor_role_id' => ContributorRole::first()->id,
    ]);

    $data = $this->actingAs($admin)->getJson('/api/v1/contributors')->assertOk()->json('data');

    expect($data)->toHaveCount(1)
        ->and($data[0]['books_count'])->toBe(1);
});

test('contributor role labels are still grouped on the books index', function () {
    $admin = n1Admin();

    $role = ContributorRole::where('name', 'Translator')->firstOrFail();

    $book = Book::create(['title' => 'Grouped', 'slug' => 'grouped', 'status' => 'Draft']);
    $book->contributors()->attach(Contributor::create([
        'name' => 'The Translator',
        'slug' => 'the-translator',
    ])->id, [
        'contributor_role_id' => $role->id,
    ]);

    $data = $this->actingAs($admin)->getJson('/api/v1/books')->assertOk()->json('data');

    $group = $data[0]['contributors'][0];

    expect($group['role_id'])->toBe($role->id)
        ->and($group['role_name'])->toBe('Translator')
        ->and($group['people'][0]['name'])->toBe('The Translator');
});
