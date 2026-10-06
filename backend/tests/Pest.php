<?php

use App\Models\ContributorRole;
use App\Models\MediaType;
use App\Models\Permission;
use App\Models\Role;
use App\Support\MediaRules;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class)->in('Feature', 'Unit');

function seedRolesAndPermissions(): void
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

    foreach ($permissions as $p) {
        Permission::firstOrCreate(['name' => $p['name']], ['label' => $p['label'], 'guard_name' => 'sanctum']);
    }

    $allPermissions = Permission::all();

    $roles = [
        'admin' => ['label' => 'Administrator', 'permissions' => $allPermissions->pluck('id')],
        'editor' => ['label' => 'Editor', 'permissions' => $allPermissions->filter(fn ($p) => ! str_starts_with($p->name, 'users.'))->pluck('id')],
        'media_manager' => ['label' => 'Media Manager', 'permissions' => Permission::where('name', 'like', 'media.%')->pluck('id')],
        'contributor_manager' => ['label' => 'Contributor Manager', 'permissions' => Permission::where('name', 'like', 'contributors.%')->pluck('id')],
        'announcer' => ['label' => 'Announcer', 'permissions' => Permission::where('name', 'like', 'announcements.%')->pluck('id')],
    ];

    foreach ($roles as $name => $config) {
        $role = Role::firstOrCreate(['name' => $name], ['label' => $config['label'], 'guard_name' => 'sanctum']);
        $role->permissions()->sync($config['permissions']);
    }

    foreach (['Author', 'Translator', 'Editor', 'Illustrator'] as $roleName) {
        ContributorRole::firstOrCreate(['name' => $roleName], ['label' => $roleName]);
    }

    foreach (MediaRules::TYPES as $name => $config) {
        MediaType::firstOrCreate(['name' => $name], ['label' => $config['label'], 'allowed_mime' => $config['mime']]);
    }
}
