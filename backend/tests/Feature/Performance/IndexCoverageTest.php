<?php

use Illuminate\Support\Facades\Schema;

test('every required index from the phase 7 checklist exists', function (string $table, string $column) {
    $indexed = collect(Schema::getIndexes($table))
        ->filter(fn (array $index) => in_array($column, $index['columns'], true))
        ->count();

    expect($indexed)->toBeGreaterThan(0);
})->with([
    ['users', 'email'],
    ['books', 'slug'],
    ['books', 'isbn'],
    ['books', 'status'],
    ['books', 'language'],
    ['books', 'book_category_id'],
    ['contributors', 'slug'],
    ['contributors', 'is_archived'],
    ['announcements', 'slug'],
    ['announcements', 'type'],
    ['announcements', 'status'],
    ['announcements', 'book_id'],
    ['media', 'mime_type'],
    ['media', 'is_archived'],
    ['media', 'uploaded_by'],
    ['mediables', 'mediable_type'],
    ['mediables', 'mediable_id'],
    ['mediables', 'media_id'],
    ['book_contributor', 'book_id'],
    ['book_contributor', 'contributor_id'],
    ['book_contributor', 'contributor_role_id'],
    ['activity_log', 'actor_id'],
    ['activity_log', 'entity_type'],
    ['activity_log', 'entity_id'],
    ['role_user', 'user_id'],
    ['permission_role', 'role_id'],
    ['book_tag', 'tag_id'],
]);

test('the filtered and joined foreign keys are all indexed', function () {
    // PostgreSQL does not index foreign key columns automatically, and
    // `constrained()` only adds the constraint.
    $required = [
        'announcements' => ['book_id'],
        'books' => ['book_category_id'],
        'media' => ['uploaded_by'],
        'role_user' => ['user_id'],
        'permission_role' => ['role_id'],
        'book_tag' => ['tag_id'],
    ];

    $missing = [];

    foreach ($required as $table => $columns) {
        $indexed = collect(Schema::getIndexes($table))->flatMap(fn (array $index) => $index['columns']);

        foreach ($columns as $column) {
            if (! $indexed->contains($column)) {
                $missing[] = "{$table}.{$column}";
            }
        }
    }

    expect($missing)->toBe([]);
});

test('book_contributor enforces one row per book, contributor and role', function () {
    $unique = collect(Schema::getIndexes('book_contributor'))
        ->filter(fn (array $index) => $index['unique']);

    $triple = $unique->first(fn (array $index) => count($index['columns']) === 3);

    expect($triple)->not->toBeNull()
        ->and(collect($triple['columns'])->sort()->values()->all())
        ->toBe(['book_id', 'contributor_id', 'contributor_role_id']);
});
