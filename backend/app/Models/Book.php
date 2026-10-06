<?php

namespace App\Models;

use App\Support\Concerns\SearchesColumns;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Book extends Model
{
    use HasFactory, SoftDeletes;
    use SearchesColumns;

    protected $fillable = [
        'title',
        'slug',
        'isbn',
        'description',
        'page_count',
        'language',
        'publication_date',
        'publisher',
        'edition',
        'status',
        'book_category_id',
        'genre',
        'is_archived',
    ];

    protected function casts(): array
    {
        return [
            'publication_date' => 'date',
            'page_count' => 'integer',
            'is_archived' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Book $book) {
            if (empty($book->slug)) {
                $book->slug = Str::slug($book->title);
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(BookCategory::class, 'book_category_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'book_tag');
    }

    public function contributors(): BelongsToMany
    {
        return $this->belongsToMany(Contributor::class, 'book_contributor')
            ->withPivot('contributor_role_id')
            ->withTimestamps();
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class);
    }

    public function media(): MorphToMany
    {
        return $this->morphToMany(Media::class, 'mediable')
            ->withPivot('media_type')
            ->withTimestamps();
    }

    public function cover(): MorphToMany
    {
        return $this->media()->wherePivot('media_type', 'Book Cover');
    }
}
