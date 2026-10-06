<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait PaginatesRequests
{
    public const DEFAULT_PER_PAGE = 15;

    public const MAX_PER_PAGE = 100;

    /**
     * Resolve the requested page size, clamped to the documented contract.
     *
     * Without the ceiling a client can ask for `per_page=100000` and force an
     * unbounded result set.
     */
    protected function perPage(Request $request, int $default = self::DEFAULT_PER_PAGE, int $max = self::MAX_PER_PAGE): int
    {
        $requested = $request->input('per_page', $default);

        if (! is_numeric($requested)) {
            return $default;
        }

        return (int) max(1, min((int) $requested, $max));
    }
}
