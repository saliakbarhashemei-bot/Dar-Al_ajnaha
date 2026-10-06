<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class ActivityLog extends Model
{
    const UPDATED_AT = null;

    protected $table = 'activity_log';

    protected $fillable = [
        'actor_id',
        'action',
        'entity_type',
        'entity_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * The audit trail is append-only: entries may be created, never
     * rewritten or removed.
     *
     * @throws LogicException
     */
    protected static function booted(): void
    {
        static::updating(function (): void {
            throw new LogicException('Activity log entries are append-only and cannot be updated.');
        });

        static::deleting(function (): void {
            throw new LogicException('Activity log entries are append-only and cannot be deleted.');
        });
    }
}
