<?php

namespace App\Policies;

use App\Models\Media;
use App\Models\User;

class MediaPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Media $media): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('media.upload');
    }

    public function update(User $user, Media $media): bool
    {
        return $user->hasPermission('media.edit');
    }

    public function replace(User $user, Media $media): bool
    {
        return $user->hasPermission('media.replace');
    }

    public function archive(User $user, Media $media): bool
    {
        return $user->hasPermission('media.archive');
    }

    public function delete(User $user, Media $media): bool
    {
        return $user->hasPermission('media.delete');
    }
}
