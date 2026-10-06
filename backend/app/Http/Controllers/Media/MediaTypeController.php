<?php

namespace App\Http\Controllers\Media;

use App\Http\Controllers\Controller;
use App\Models\MediaType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Cache;

class MediaTypeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $types = Cache::remember(
            'media_types.all',
            86400,
            fn () => MediaType::all()
        );

        return JsonResource::collection($types);
    }
}
