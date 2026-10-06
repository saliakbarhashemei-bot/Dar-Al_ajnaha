<?php

namespace App\Http\Resources;

use App\Http\Controllers\Contributor\ContributorRoleController;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'isbn' => $this->isbn,
            'description' => $this->description,
            'page_count' => $this->page_count,
            'language' => $this->language,
            'publication_date' => $this->publication_date?->toDateString(),
            'publisher' => $this->publisher,
            'edition' => $this->edition,
            'status' => $this->status,
            'is_archived' => $this->is_archived,
            'category' => BookCategoryResource::make($this->whenLoaded('category')),
            'genre' => $this->genre,
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'contributors' => $this->whenLoaded('contributors', fn () => $this->groupContributorsByRole()),
            'contributors_count' => $this->whenCounted('contributors'),
            'media' => $this->whenLoaded('media', fn () => $this->media->loadMissing('uploader')->map(
                fn ($m) => array_merge((new MediaResource($m))->toArray($request), ['pivot_media_type' => $m->pivot->media_type])
            )),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function groupContributorsByRole(): array
    {
        // Reuse the cached role list: a per-row `ContributorRole::all()`
        // turns a 15-book page into 20 queries.
        $roles = ContributorRoleController::allCached()->keyBy('id');

        return $this->contributors
            ->groupBy(fn ($c) => $c->pivot->contributor_role_id)
            ->map(fn ($people, $roleId) => [
                'role_id' => (int) $roleId,
                'role_name' => $roles->get((int) $roleId)?->name,
                'role_label' => $roles->get((int) $roleId)?->label,
                'people' => $people->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                ])->values(),
            ])
            ->values()
            ->toArray();
    }
}
