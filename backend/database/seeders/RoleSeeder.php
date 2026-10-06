<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            'admin' => ['label' => 'Administrator', 'permissions' => '*'],
            'editor' => ['label' => 'Editor', 'permissions' => 'except:users.*'],
            'media_manager' => ['label' => 'Media Manager', 'permissions' => ['media.*', 'media.link']],
            'contributor_manager' => ['label' => 'Contributor Manager', 'permissions' => ['contributors.*']],
            'announcer' => ['label' => 'Announcer', 'permissions' => ['announcements.*']],
        ];

        $allPermissions = Permission::all();

        foreach ($roles as $name => $config) {
            $role = Role::firstOrCreate(
                ['name' => $name],
                ['label' => $config['label'], 'guard_name' => 'sanctum']
            );

            if ($config['permissions'] === '*') {
                $role->permissions()->sync($allPermissions->pluck('id'));
            } elseif (is_string($config['permissions']) && str_starts_with($config['permissions'], 'except:')) {
                $except = explode(',', substr($config['permissions'], 6));
                $filtered = $allPermissions->reject(fn ($p) => str_starts_with($p->name, $except[0]));
                $role->permissions()->sync($filtered->pluck('id'));
            } else {
                $role->permissions()->sync(Permission::whereIn('name', $config['permissions'])->pluck('id'));
            }
        }
    }
}
