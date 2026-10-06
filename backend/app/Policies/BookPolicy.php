<?php

namespace App\Policies;

use App\Models\Book;
use App\Models\User;

class BookPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Book $book): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('books.create');
    }

    public function update(User $user, Book $book): bool
    {
        return $user->hasPermission('books.edit');
    }

    public function archive(User $user, Book $book): bool
    {
        return $user->hasPermission('books.archive');
    }

    public function delete(User $user, Book $book): bool
    {
        return $user->hasPermission('books.delete');
    }

    public function attachContributor(User $user, Book $book): bool
    {
        return $user->hasPermission('books.edit');
    }

    public function detachContributor(User $user, Book $book): bool
    {
        return $user->hasPermission('books.edit');
    }

    public function updateContributor(User $user, Book $book): bool
    {
        return $user->hasPermission('books.edit');
    }
}
