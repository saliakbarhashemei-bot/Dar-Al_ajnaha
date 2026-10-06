<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'short_description' => $this->short_description,
            'content' => $this->content,
            'type' => $this->type,
            'status' => $this->status,
            'book' => BookResource::make($this->whenLoaded('book')),
            'scheduled_at' => $this->scheduled_at?->toISOString(),
            'published_at' => $this->published_at?->toISOString(),
            'is_archived' => $this->is_archived,
            'media' => $this->whenLoaded('media', fn () => $this->media->loadMissing('uploader')->map(
                fn ($m) => array_merge((new MediaResource($m))->toArray($request), ['pivot_media_type' => $m->pivot->media_type])
            )),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
