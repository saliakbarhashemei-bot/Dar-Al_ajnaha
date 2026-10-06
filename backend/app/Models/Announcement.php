<?php

namespace App\Models;

use App\Support\Concerns\SearchesColumns;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Announcement extends Model
{
    use HasFactory, SoftDeletes;
    use SearchesColumns;

    protected $fillable = [
        'title',
        'slug',
        'short_description',
        'content',
        'type',
        'status',
        'book_id',
        'scheduled_at',
        'published_at',
        'is_archived',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'published_at' => 'datetime',
            'is_archived' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Announcement $announcement) {
            if (empty($announcement->slug)) {
                $announcement->slug = Str::slug($announcement->title);
            }
        });
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function media(): MorphToMany
    {
        return $this->morphToMany(Media::class, 'mediable')
            ->withPivot('media_type')
            ->withTimestamps();
    }
}
