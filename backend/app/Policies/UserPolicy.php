<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, User $target): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('users.create');
    }

    public function update(User $user, User $target): bool
    {
        if ($user->id === $target->id) {
            return true;
        }

        return $user->hasPermission('users.edit');
    }

    public function disable(User $user, User $target): bool
    {
        if ($user->id === $target->id) {
            return false;
        }

        return $user->hasPermission('users.disable');
    }

    public function delete(User $user, User $target): bool
    {
        if ($user->id === $target->id) {
            return false;
        }

        return $user->hasPermission('users.delete');
    }

    public function updateRoles(User $user, User $target): bool
    {
        return $user->hasPermission('users.edit');
    }
}
