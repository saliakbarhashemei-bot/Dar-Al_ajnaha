<?php

namespace App\Http\Requests\Media;

use App\Models\Media;
use App\Support\MediaRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AttachMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'media_id' => ['required', 'exists:media,id'],
            'media_type' => ['required', 'string', Rule::in(MediaRules::names())],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $media = Media::find($this->input('media_id'));

            if (! $media) {
                return;
            }

            if ($media->is_archived) {
                $validator->errors()->add('media_id', 'Archived media cannot be attached.');

                return;
            }

            $config = MediaRules::config($this->input('media_type'));

            if ($config && ! in_array($media->mime_type, $config['mime'], true)) {
                $validator->errors()->add('media_type', 'This file\'s MIME type '.$media->mime_type.' is not allowed for '.$this->input('media_type').'.');
            }
        });
    }
}
