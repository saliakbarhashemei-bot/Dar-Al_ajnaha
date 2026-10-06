<?php

namespace Database\Seeders;

use App\Models\MediaType;
use App\Support\MediaRules;
use Illuminate\Database\Seeder;

class MediaTypeSeeder extends Seeder
{
    public function run(): void
    {
        foreach (MediaRules::TYPES as $name => $config) {
            MediaType::updateOrCreate(
                ['name' => $name],
                ['label' => $config['label'], 'allowed_mime' => $config['mime']]
            );
        }
    }
}
