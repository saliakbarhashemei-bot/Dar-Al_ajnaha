<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['name' => 'users.create', 'label' => 'Create User'],
            ['name' => 'users.edit', 'label' => 'Edit User'],
            ['name' => 'users.disable', 'label' => 'Disable User'],
            ['name' => 'users.delete', 'label' => 'Delete / Archive User'],
            ['name' => 'contributors.create', 'label' => 'Create Person'],
            ['name' => 'contributors.edit', 'label' => 'Edit Person'],
            ['name' => 'contributors.archive', 'label' => 'Archive Person'],
            ['name' => 'contributors.delete', 'label' => 'Delete Person'],
            ['name' => 'books.create', 'label' => 'Create Book'],
            ['name' => 'books.edit', 'label' => 'Edit Book'],
            ['name' => 'books.archive', 'label' => 'Archive Book'],
            ['name' => 'books.delete', 'label' => 'Delete Book'],
            ['name' => 'media.upload', 'label' => 'Upload Media'],
            ['name' => 'media.edit', 'label' => 'Edit Media'],
            ['name' => 'media.replace', 'label' => 'Replace Media'],
            ['name' => 'media.archive', 'label' => 'Archive Media'],
            ['name' => 'media.delete', 'label' => 'Delete Media'],
            ['name' => 'announcements.create', 'label' => 'Create Announcement'],
            ['name' => 'announcements.edit', 'label' => 'Edit Announcement'],
            ['name' => 'announcements.archive', 'label' => 'Archive Announcement'],
            ['name' => 'announcements.delete', 'label' => 'Delete Announcement'],
            ['name' => 'media.link', 'label' => 'Attach Media to entity'],
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission['name']],
                ['label' => $permission['label'], 'guard_name' => 'sanctum']
            );
        }
    }
}
