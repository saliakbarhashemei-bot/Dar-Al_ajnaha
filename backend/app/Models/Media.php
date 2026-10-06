<?php

namespace App\Models;

use App\Support\Concerns\SearchesColumns;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Media extends Model
{
    use HasFactory, SoftDeletes;
    use SearchesColumns;

    protected $table = 'media';

    protected $fillable = [
        'disk',
        'path',
        'file_name',
        'mime_type',
        'size',
        'width',
        'height',
        'alt_text',
        'caption',
        'description',
        'uploaded_by',
        'is_archived',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'is_archived' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function books(): MorphToMany
    {
        return $this->morphedByMany(Book::class, 'mediable')
            ->withPivot('media_type')
            ->withTimestamps();
    }

    public function contributors(): MorphToMany
    {
        return $this->morphedByMany(Contributor::class, 'mediable')
            ->withPivot('media_type')
            ->withTimestamps();
    }

    public function announcements(): MorphToMany
    {
        return $this->morphedByMany(Announcement::class, 'mediable')
            ->withPivot('media_type')
            ->withTimestamps();
    }

    /**
     * Relative URL of the authorized download route.
     *
     * The `local` disk is private, so the framework's `/storage` route only
     * accepts signed URLs. Media is therefore streamed through
     * `GET /api/v1/media/{media}/file`, which is authorization-checked. A
     * relative path keeps the frontend's dev proxy and same-origin deploys
     * working without CORS.
     */
    public function url(): string
    {
        return route('media.file', ['media' => $this->id], absolute: false);
    }
}
