<?php

namespace App\Http\Controllers\Contributor;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContributorRoleResource;
use App\Models\ContributorRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class ContributorRoleController extends Controller
{
    public const CACHE_KEY = 'contributor_roles.all';

    public const CACHE_TTL = 86400;

    public function index(Request $request): AnonymousResourceCollection
    {
        return ContributorRoleResource::collection(self::allCached());
    }

    /**
     * All contributor roles, cached.
     *
     * Shared with the book resource, which needs the role labels to group a
     * book's contributors; a single cached read keeps that grouping free of
     * a query per book row.
     */
    public static function allCached(): Collection
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, fn () => ContributorRole::all());
    }
}
