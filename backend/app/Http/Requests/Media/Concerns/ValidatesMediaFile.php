<?php

namespace App\Http\Requests\Media\Concerns;

use App\Support\MediaRules;
use Illuminate\Http\UploadedFile;

trait ValidatesMediaFile
{
    protected function validateFileAgainstType(?UploadedFile $file, ?string $type, callable $addError): void
    {
        if (! $file || ! $type) {
            return;
        }

        $config = MediaRules::config($type);

        if (! $config) {
            return;
        }

        if ($file->getSize() !== false && $file->getSize() > $config['max_size']) {
            $addError('file', 'File exceeds the maximum size of '.round($config['max_size'] / 1024 / 1024, 1).' MB for '.$type.'.');
        }

        // Sniffed MIME from file content — never trust the client claim.
        $mime = $file->getMimeType();

        if (! in_array($mime, $config['mime'], true)) {
            $addError('file', 'MIME type '.$mime.' is not allowed for '.$type.'.');

            return;
        }

        if (MediaRules::isImageType($type) && $mime !== 'image/svg+xml') {
            $dims = @getimagesize($file->getPathname());

            if ($dims === false) {
                $addError('file', 'Could not read image dimensions.');

                return;
            }

            [$width, $height] = $dims;

            if ($width < $config['min_width'] || $height < $config['min_height']
                || $width > $config['max_width'] || $height > $config['max_height']) {
                $addError('file', "Image dimensions {$width}x{$height}px are outside the allowed range for {$type} ({$config['min_width']}x{$config['min_height']} to {$config['max_width']}x{$config['max_height']}px).");
            }
        }
    }
}
