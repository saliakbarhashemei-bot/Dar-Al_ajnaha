<?php

namespace App\Policies;

use App\Models\BookCategory;
use App\Models\User;

class BookCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, BookCategory $category): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('books.edit');
    }

    public function update(User $user, BookCategory $category): bool
    {
        return $user->hasPermission('books.edit');
    }

    public function delete(User $user, BookCategory $category): bool
    {
        return $user->hasPermission('books.edit');
    }
}
