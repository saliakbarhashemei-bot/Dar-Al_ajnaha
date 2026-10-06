<?php

namespace App\Support\Concerns;

trait SearchesColumns
{
    /**
     * Case-insensitive substring search across the given columns.
     *
     * PostgreSQL's LIKE is case-sensitive, so the checklist calls for ILIKE.
     * Column names come from the caller (never from input); the search term is
     * always passed as a bound parameter, and LIKE wildcards in the term are
     * escaped so a user cannot turn a search into a full scan or match
     * everything.
     *
     * @param  array<int, string>  $columns
     */
    public function scopeSearchColumns($query, array $columns, ?string $term): void
    {
        $term = trim((string) $term);

        if ($term === '' || $columns === []) {
            return;
        }

        $pattern = '%'.$this->escapeLikeWildcards($term).'%';

        $query->where(function ($sub) use ($columns, $pattern) {
            foreach ($columns as $column) {
                $sub->orWhereRaw("{$column} ILIKE ? ESCAPE '\\'", [$pattern]);
            }
        });
    }

    private function escapeLikeWildcards(string $term): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term);
    }
}
