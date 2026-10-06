<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContributorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'biography' => $this->biography,
            'email' => $this->email,
            'phone' => $this->phone,
            'website' => $this->website,
            'birth_date' => $this->birth_date?->toDateString(),
            'nationality' => $this->nationality,
            'is_archived' => $this->is_archived,
            // The controller already eager-loads the count with withCount();
            // re-counting here would issue one query per row.
            'books_count' => $this->whenCounted('books'),
            'media' => $this->whenLoaded('media', fn () => $this->media->loadMissing('uploader')->map(
                fn ($m) => array_merge((new MediaResource($m))->toArray($request), ['pivot_media_type' => $m->pivot->media_type])
            )),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
