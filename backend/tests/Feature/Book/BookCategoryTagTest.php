<?php

use App\Models\Book;
use App\Models\BookCategory;
use App\Models\Role;
use App\Models\Tag;
use App\Models\User;

test('category store requires books.edit', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'announcer')->first();
    $user->roles()->attach($role);

    $this->actingAs($user)
        ->postJson('/api/v1/book-categories', ['name' => 'Fiction', 'label' => 'Fiction'])
        ->assertForbidden();
});

test('category crud with permission', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $created = $this->actingAs($user)
        ->postJson('/api/v1/book-categories', ['name' => 'Fiction', 'label' => 'Fiction'])
        ->assertCreated();

    $id = $created->json('data.id');

    $this->actingAs($user)
        ->putJson("/api/v1/book-categories/{$id}", ['label' => 'Fiction Books'])
        ->assertOk();
});

test('cannot delete category referenced by book', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);
    $category = BookCategory::create(['name' => 'Kids', 'label' => 'Kids']);
    Book::create(['title' => 'Kids Book', 'slug' => 'kids-book', 'status' => 'Draft', 'book_category_id' => $category->id]);

    $this->actingAs($user)
        ->deleteJson("/api/v1/book-categories/{$category->id}")
        ->assertStatus(422);
});

test('tag store and delete rules', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();
    $role = Role::where('name', 'admin')->first();
    $user->roles()->attach($role);

    $created = $this->actingAs($user)
        ->postJson('/api/v1/tags', ['name' => 'classic', 'label' => 'Classic'])
        ->assertCreated();

    $tagId = $created->json('data.id');
    $tag = Tag::find($tagId);

    $book = Book::create(['title' => 'Tagged', 'slug' => 'tagged', 'status' => 'Draft']);
    $book->tags()->attach($tag->id);

    $this->actingAs($user)
        ->deleteJson("/api/v1/tags/{$tag->id}")
        ->assertStatus(422);

    $book->tags()->detach($tag->id);

    $this->actingAs($user)
        ->deleteJson("/api/v1/tags/{$tag->id}")
        ->assertOk();
});
