<?php

namespace App\Models;

use App\Support\Concerns\SearchesColumns;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Contributor extends Model
{
    use HasFactory, SoftDeletes;
    use SearchesColumns;

    protected $fillable = [
        'name',
        'slug',
        'biography',
        'email',
        'phone',
        'website',
        'birth_date',
        'nationality',
        'is_archived',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'is_archived' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Contributor $contributor) {
            if (empty($contributor->slug)) {
                $contributor->slug = Str::slug($contributor->name);
            }
        });
    }

    public function books(): BelongsToMany
    {
        return $this->belongsToMany(Book::class, 'book_contributor')
            ->withPivot('contributor_role_id')
            ->withTimestamps();
    }

    public function media(): MorphToMany
    {
        return $this->morphToMany(Media::class, 'mediable')
            ->withPivot('media_type')
            ->withTimestamps();
    }

    public function photo(): MorphToMany
    {
        return $this->media()->wherePivot('media_type', 'Person Photo');
    }
}
