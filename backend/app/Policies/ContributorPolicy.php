<?php

namespace App\Policies;

use App\Models\Contributor;
use App\Models\User;

class ContributorPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Contributor $contributor): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('contributors.create');
    }

    public function update(User $user, Contributor $contributor): bool
    {
        return $user->hasPermission('contributors.edit');
    }

    public function archive(User $user, Contributor $contributor): bool
    {
        return $user->hasPermission('contributors.archive');
    }

    public function delete(User $user, Contributor $contributor): bool
    {
        return $user->hasPermission('contributors.delete');
    }
}
