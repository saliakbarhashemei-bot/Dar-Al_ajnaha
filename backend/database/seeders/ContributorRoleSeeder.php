<?php

namespace Database\Seeders;

use App\Models\ContributorRole;
use Illuminate\Database\Seeder;

class ContributorRoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'Author', 'label' => 'Author'],
            ['name' => 'Translator', 'label' => 'Translator'],
            ['name' => 'Editor', 'label' => 'Editor'],
            ['name' => 'Illustrator', 'label' => 'Illustrator'],
        ];

        foreach ($roles as $role) {
            ContributorRole::firstOrCreate(['name' => $role['name']], ['label' => $role['label']]);
        }
    }
}
