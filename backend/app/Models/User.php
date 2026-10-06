<?php

namespace App\Models;

use App\Support\Concerns\SearchesColumns;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;
    use SearchesColumns;

    protected $fillable = [
        'name',
        'email',
        'password',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'permission_role', 'user_id', 'permission_id')
            ->join('role_user', 'permission_role.role_id', '=', 'role_user.role_id')
            ->whereColumn('role_user.user_id', 'users.id');
    }

    public function hasPermission(string $name): bool
    {
        if (! $this->exists) {
            return $this->roles()
                ->whereHas('permissions', fn ($q) => $q->where('name', $name))
                ->exists();
        }

        $permissions = Cache::remember(
            "user.{$this->id}.permissions",
            3600,
            fn () => $this->roles()->with('permissions')->get()
                ->flatMap(fn ($role) => $role->permissions->pluck('name'))
                ->unique()
                ->values()
                ->toArray()
        );

        return in_array($name, $permissions, true);
    }

    public function flushPermissionCache(): void
    {
        Cache::forget("user.{$this->id}.permissions");
    }

    /**
     * Revoke every API token and drop the cached permission set.
     *
     * Called whenever the credentials or the access level of the account
     * change, so a token issued before the change stops working.
     */
    public function revokeAllTokens(): void
    {
        $this->tokens()->delete();
        $this->flushPermissionCache();
    }

    public function hasRole(string $name): bool
    {
        return $this->roles()->where('name', $name)->exists();
    }
}
