<?php

namespace App\Policies;

use App\Models\Announcement;
use App\Models\User;

class AnnouncementPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Announcement $announcement): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('announcements.create');
    }

    public function update(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.edit');
    }

    public function archive(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.archive');
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.delete');
    }
}
