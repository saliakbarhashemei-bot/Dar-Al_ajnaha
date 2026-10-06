<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\User;

class ActivityLogObserver
{
    public function created(User $user): void
    {
        ActivityLog::create([
            'actor_id' => $user->id,
            'action' => 'user.create',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);
    }

    public function updated(User $user): void
    {
        ActivityLog::create([
            'actor_id' => $user->id,
            'action' => 'user.update',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);
    }

    public function deleted(User $user): void
    {
        ActivityLog::create([
            'actor_id' => $user->id,
            'action' => 'user.delete',
            'entity_type' => 'user',
            'entity_id' => $user->id,
        ]);
    }
}
