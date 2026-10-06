<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MediaType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'label',
        'allowed_mime',
    ];

    protected function casts(): array
    {
        return [
            'allowed_mime' => 'array',
        ];
    }
}
