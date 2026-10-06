<?php

namespace App\Support;

class MediaRules
{
    /**
     * Single source of truth for per-type upload limits.
     * allowed_mime is mirrored into the media_types table by MediaTypeSeeder.
     */
    public const TYPES = [
        'Book Cover' => [
            'label' => 'Book Cover',
            'mime' => ['image/jpeg', 'image/png', 'image/webp'],
            'max_size' => 5 * 1024 * 1024,
            'min_width' => 400,
            'min_height' => 600,
            'max_width' => 2000,
            'max_height' => 3000,
        ],
        'Book Image' => [
            'label' => 'Book Image',
            'mime' => ['image/jpeg', 'image/png', 'image/webp'],
            'max_size' => 5 * 1024 * 1024,
            'min_width' => 200,
            'min_height' => 200,
            'max_width' => 4000,
            'max_height' => 4000,
        ],
        'Person Photo' => [
            'label' => 'Person Photo',
            'mime' => ['image/jpeg', 'image/png', 'image/webp'],
            'max_size' => 3 * 1024 * 1024,
            'min_width' => 200,
            'min_height' => 200,
            'max_width' => 2000,
            'max_height' => 2000,
        ],
        'Announcement Image' => [
            'label' => 'Announcement Image',
            'mime' => ['image/jpeg', 'image/png', 'image/webp'],
            'max_size' => 5 * 1024 * 1024,
            'min_width' => 400,
            'min_height' => 300,
            'max_width' => 4000,
            'max_height' => 4000,
        ],
        'Publisher Logo' => [
            'label' => 'Publisher Logo',
            'mime' => ['image/svg+xml', 'image/png'],
            'max_size' => 1024 * 1024,
            'min_width' => 64,
            'min_height' => 64,
            'max_width' => 1024,
            'max_height' => 1024,
        ],
        'Document' => [
            'label' => 'Document',
            'mime' => ['application/pdf'],
            'max_size' => 20 * 1024 * 1024,
            'min_width' => null,
            'min_height' => null,
            'max_width' => null,
            'max_height' => null,
        ],
    ];

    public static function names(): array
    {
        return array_keys(self::TYPES);
    }

    public static function config(string $type): ?array
    {
        return self::TYPES[$type] ?? null;
    }

    public static function isImageType(string $type): bool
    {
        $config = self::config($type);

        return $config !== null && $config['min_width'] !== null;
    }
}
