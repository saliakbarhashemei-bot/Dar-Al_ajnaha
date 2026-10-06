<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mediable extends Model
{
    protected $table = 'mediables';

    protected $fillable = [
        'media_id',
        'mediable_type',
        'mediable_id',
        'media_type',
    ];

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
